import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';

/**
 * RF06 — Resumo financeiro do mês atual + dia atual
 *
 * BAIXADOS (pagos): busca mês atual + meses anteriores para capturar
 *   pagamentos de boletos atrasados feitos hoje.
 * ABERTOS: apenas boletos de associados ATIVOS (codigo_situacao_associado = "1"),
 *   excluindo cancelados/pré-cancelados.
 *
 * codigo_situacao 1 = BAIXADO (pago)
 * codigo_situacao 2 = ABERTO
 */

interface MesResult {
  count: number;
  total: number;
  countHoje: number;
  totalHoje: number;
}

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr.substring(0, 10);
}

/** Retorna lista de mes_referente no formato MM/YYYY para os últimos N meses (incluindo o atual) */
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
  let allBoletos: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let response;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await client.post('listar/boleto', {
          ...body,
          inicio_paginacao: page,
          quantidade_por_pagina: 5000,
        }, { timeout: 300000 });
        break;
      } catch (e: any) {
        if (e.response?.status === 406) {
          console.log(`[Provider] ${label} página ${page}: 406 - sem mais dados`);
          hasMore = false;
          break;
        }
        if (attempt < maxRetries) {
          const delay = attempt * 5000;
          console.warn(`[Provider] ${label} página ${page} tentativa ${attempt} falhou: ${e.message} — retry em ${delay / 1000}s`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw e;
        }
      }
    }
    if (!hasMore || !response) break;

    const data = response.data;
    const boletos = Array.isArray(data) ? data : (data?.boletos ?? []);
    allBoletos = allBoletos.concat(boletos);

    hasMore = boletos.length >= 5000;
    page++;
    if (page >= 10) hasMore = false;
  }

  return allBoletos;
}

export async function getMonthlyFinancials(
  client: AxiosInstance
): Promise<FinancialSummary> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mesRef = `${mm}/${yyyy}`;
  const hojeISO = `${yyyy}-${mm}-${dd}`;
  const errors: string[] = [];

  let result: FinancialSummary = {
    recebidoHoje: 0, qtdRecebidoHoje: 0,
    abertoHoje: 0, qtdAbertoHoje: 0,
    pagoMes: 0, qtdPagoMes: 0,
    abertoMes: 0, qtdAbertoMes: 0,
  };

  // ── BAIXADOS (pagos) ────────────────────────────────────────────��
  // Mês atual: contabiliza totais do mês + pagos hoje
  // Meses anteriores (até 3): só contabiliza pagos hoje (boletos atrasados)
  try {
    const months = getRecentMonths(4); // mês atual + 3 anteriores

    for (const mes of months) {
      const isCurrentMonth = mes === mesRef;
      const label = `BAIXADOS (${mes})`;

      const boletos = await fetchBoletosWithRetry(client, {
        codigo_situacao: 1,
        mes_referente: mes,
      }, label);

      let mesCount = 0, mesTotal = 0, hojeCount = 0, hojeTotal = 0;

      for (const b of boletos) {
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
        `[Provider] ${label}: ${boletos.length} boletos, ${hojeCount} pagos hoje (R$ ${hojeTotal.toFixed(2)})` +
        (isCurrentMonth ? `, total mês: ${mesCount} (R$ ${mesTotal.toFixed(2)})` : '')
      );

      // Se mês anterior não tem boletos pagos hoje, pular os mais antigos
      if (!isCurrentMonth && hojeCount === 0) break;
    }
  } catch (e: any) {
    console.error(`[Provider] Erro BAIXADOS: ${e.message}`);
    errors.push('baixados');
  }

  // ── ABERTOS ───────────────────────────────────────────────────────
  // Filtra apenas boletos de associados ATIVOS (exclui cancelados)
  try {
    const boletos = await fetchBoletosWithRetry(client, {
      codigo_situacao: 2,
      mes_referente: mesRef,
    }, `ABERTOS (${mesRef})`);

    let totalCount = 0, totalVal = 0, hojeCount = 0, hojeVal = 0;
    let filtrados = 0;

    for (const b of boletos) {
      // Excluir boletos de associados não-ativos (cancelados, pré-cancelamento, etc.)
      if (b.codigo_situacao_associado !== '1') {
        filtrados++;
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
      `[Provider] ABERTOS (${mesRef}): ${totalCount} boletos ativos (R$ ${totalVal.toFixed(2)}), ` +
      `${filtrados} filtrados (não-ativos), ${hojeCount} vencendo hoje`
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
