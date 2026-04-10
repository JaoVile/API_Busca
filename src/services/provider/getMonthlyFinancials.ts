import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';

/**
 * RF06 — Resumo financeiro do mês atual + dia atual
 *
 * BAIXADOS (pagos): busca mês atual + meses anteriores para capturar
 *   pagamentos de boletos atrasados feitos hoje.
 * ABERTOS: boletos com vencimento/referência do mês atual.
 *
 * Em AMBOS, filtra sempre `codigo_situacao_associado === '1'` (associado ativo).
 * Boletos de cancelados / pré-cancelamento são sempre excluídos dos totais,
 * independentemente de haver filtro por codigo_regional.
 *
 * codigo_situacao 1 = BAIXADO (pago)
 * codigo_situacao 2 = ABERTO
 *
 * Paginação de listar/boleto: `inicio_paginacao` é NÚMERO DE PÁGINA 0-indexed
 * (diferente de listar/veiculo que usa offset). Com qp=500: 0, 1, 2, 3, ...
 */

const PAGE_SIZE = 500;
const MAX_PAGES = 300;

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr.substring(0, 10);
}

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    months.push(`${mm}/${yyyy}`);
  }
  return months;
}

async function fetchBoletosWithRetry(
  client: AxiosInstance,
  body: Record<string, any>,
  label: string
): Promise<any[]> {
  const allBoletos: any[] = [];
  let page = 0;

  while (page < MAX_PAGES) {
    let response: any;
    const maxRetries = 3;
    let failed = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await client.post('listar/boleto', {
          ...body,
          inicio_paginacao: page,
          quantidade_por_pagina: PAGE_SIZE,
        }, { timeout: 120000 });
        break;
      } catch (e: any) {
        if (e.response?.status === 406) {
          console.log(`[Provider] ${label} página ${page}: 406 - sem mais dados`);
          failed = true;
          break;
        }
        if (attempt < maxRetries) {
          const delay = attempt * 3000;
          console.warn(`[Provider] ${label} p${page} tentativa ${attempt} falhou: ${e.message} — retry em ${delay / 1000}s`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw e;
        }
      }
    }
    if (failed || !response) break;

    const data = response.data;
    const boletos = Array.isArray(data) ? data : (data?.boletos ?? []);
    allBoletos.push(...boletos);

    if (boletos.length < PAGE_SIZE) break;
    page++;
  }

  return allBoletos;
}

function matchesRegional(boleto: any, codigoRegional?: string | null): boolean {
  if (!codigoRegional) return true;
  return String(boleto.codigo_regional) === String(codigoRegional);
}

export async function getMonthlyFinancials(
  client: AxiosInstance,
  codigoRegional?: string | null
): Promise<FinancialSummary> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mesRef = `${mm}/${yyyy}`;
  const hojeISO = `${yyyy}-${mm}-${dd}`;
  const errors: string[] = [];
  const regLabel = codigoRegional ? ` regional=${codigoRegional}` : '';

  const result: FinancialSummary = {
    recebidoHoje: 0, qtdRecebidoHoje: 0,
    abertoHoje: 0, qtdAbertoHoje: 0,
    pagoMes: 0, qtdPagoMes: 0,
    abertoMes: 0, qtdAbertoMes: 0,
  };

  // ── BAIXADOS (pagos) ───────────────────────────────────────────────
  // Mês atual: totais do mês + pagos hoje
  // Meses anteriores (até 3): só pagos hoje (boletos atrasados)
  try {
    const months = getRecentMonths(4);

    for (const mes of months) {
      const isCurrentMonth = mes === mesRef;
      const label = `BAIXADOS (${mes})${regLabel}`;

      const boletos = await fetchBoletosWithRetry(client, {
        codigo_situacao: 1,
        mes_referente: mes,
      }, label);

      let mesCount = 0, mesTotal = 0, hojeCount = 0, hojeTotal = 0;
      let filtradosSitAssoc = 0;

      for (const b of boletos) {
        if (!matchesRegional(b, codigoRegional)) continue;
        // Exclui cancelados / pré-cancelamento sempre
        if (String(b.codigo_situacao_associado) !== '1') {
          filtradosSitAssoc++;
          continue;
        }

        const valor = parseFloat(String(b.valor_pagamento || b.valor_boleto || '0').replace(',', '.')) || 0;
        const dataPag = parseDateToISO(b.data_pagamento || '');

        if (isCurrentMonth) {
          mesCount++;
          mesTotal += valor;
        }

        if (dataPag === hojeISO) {
          hojeCount++;
          hojeTotal += valor;
        }
      }

      if (isCurrentMonth) {
        result.pagoMes = mesTotal;
        result.qtdPagoMes = mesCount;
      }

      result.recebidoHoje += hojeTotal;
      result.qtdRecebidoHoje += hojeCount;

      console.log(
        `[Provider] ${label}: ${boletos.length} boletos (${filtradosSitAssoc} cancelados filtrados), ` +
        `${hojeCount} pagos hoje (R$ ${hojeTotal.toFixed(2)})` +
        (isCurrentMonth ? `, total mês: ${mesCount} boletos R$ ${mesTotal.toFixed(2)}` : '')
      );

      if (!isCurrentMonth && hojeCount === 0) break;
    }
  } catch (e: any) {
    console.error(`[Provider] Erro BAIXADOS: ${e.message}`);
    errors.push('baixados');
  }

  // ── ABERTOS ────────────────────────────────────────────────────────
  try {
    const label = `ABERTOS (${mesRef})${regLabel}`;
    const boletos = await fetchBoletosWithRetry(client, {
      codigo_situacao: 2,
      mes_referente: mesRef,
    }, label);

    let totalCount = 0, totalVal = 0, hojeCount = 0, hojeVal = 0;
    let filtradosSitAssoc = 0;
    let filtradosRegional = 0;

    for (const b of boletos) {
      if (!matchesRegional(b, codigoRegional)) {
        filtradosRegional++;
        continue;
      }
      if (String(b.codigo_situacao_associado) !== '1') {
        filtradosSitAssoc++;
        continue;
      }

      const valor = parseFloat(String(b.valor_boleto || '0').replace(',', '.')) || 0;
      totalCount++;
      totalVal += valor;

      const venc = parseDateToISO(b.data_vencimento || '');
      if (venc === hojeISO) {
        hojeCount++;
        hojeVal += valor;
      }
    }

    result.abertoMes = totalVal;
    result.qtdAbertoMes = totalCount;
    result.abertoHoje = hojeVal;
    result.qtdAbertoHoje = hojeCount;

    console.log(
      `[Provider] ${label}: ${totalCount} válidos (R$ ${totalVal.toFixed(2)}), ` +
      `${filtradosSitAssoc} filtrados sit_assoc, ${filtradosRegional} filtrados regional, ${hojeCount} vencendo hoje`
    );
  } catch (e: any) {
    console.error(`[Provider] Erro ABERTOS: ${e.message}`);
    errors.push('abertos');
  }

  if (errors.length > 0) {
    throw new Error(`Provider Financeiro: falha em ${errors.join(', ')}`);
  }

  return result;
}
