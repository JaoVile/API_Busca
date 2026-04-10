import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';
import { VehicleContext } from './vehicleContext';
import { fetchCancelSituationCodes } from './cancelCodes';

/**
 * RF06 — Resumo financeiro do mês atual + dia atual
 *
 * BAIXADOS (pagos): busca mês atual + meses anteriores para capturar
 *   pagamentos de boletos atrasados feitos hoje.
 * ABERTOS: boletos com mes_referente do mês atual.
 *
 * Filtros sempre aplicados:
 *  - `codigo_situacao_associado` NÃO está em cancelCodes (exclui apenas
 *    CANCELADO / PRE-CANCELAMENTO; inadimplentes e negativados permanecem).
 *  - Se houver VehicleContext: só conta boletos cujo `codigo_associado`
 *    pertence a `ctx.allowedAssociados`.
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
        }, { timeout: 180000 });
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

export async function getMonthlyFinancials(
  client: AxiosInstance,
  ctx: VehicleContext | null
): Promise<FinancialSummary> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mesRef = `${mm}/${yyyy}`;
  const hojeISO = `${yyyy}-${mm}-${dd}`;
  const errors: string[] = [];

  const filterLabel = ctx
    ? ` [${[
        ctx.filter.codigoRegional ? `reg=${ctx.filter.codigoRegional}` : null,
        ctx.filter.codigoCooperativa ? `coop=${ctx.filter.codigoCooperativa}` : null,
      ].filter(Boolean).join(' ')}]`
    : '';

  const cancelCodes = await fetchCancelSituationCodes(client);

  // Predicate unificado — devolve true se o boleto deve ser CONTADO
  const shouldCount = (b: any, stats: { filtradosCancel: number; filtradosCtx: number }): boolean => {
    if (cancelCodes.includes(String(b.codigo_situacao_associado))) {
      stats.filtradosCancel++;
      return false;
    }
    if (ctx && !ctx.allowedAssociados.has(String(b.codigo_associado))) {
      stats.filtradosCtx++;
      return false;
    }
    return true;
  };

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
      const label = `BAIXADOS (${mes})${filterLabel}`;

      const boletos = await fetchBoletosWithRetry(client, {
        codigo_situacao: 1,
        mes_referente: mes,
      }, label);

      const stats = { filtradosCancel: 0, filtradosCtx: 0 };
      let mesCount = 0, mesTotal = 0, hojeCount = 0, hojeTotal = 0;

      for (const b of boletos) {
        if (!shouldCount(b, stats)) continue;

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
        `[Provider] ${label}: ${boletos.length} total (${stats.filtradosCancel} cancelados, ${stats.filtradosCtx} fora do filtro), ` +
        `${hojeCount} pagos hoje (R$ ${hojeTotal.toFixed(2)})` +
        (isCurrentMonth ? `, mês: ${mesCount} (R$ ${mesTotal.toFixed(2)})` : '')
      );

      if (!isCurrentMonth && hojeCount === 0) break;
    }
  } catch (e: any) {
    console.error(`[Provider] Erro BAIXADOS: ${e.message}`);
    errors.push('baixados');
  }

  // ── ABERTOS ────────────────────────────────────────────────────────
  try {
    const label = `ABERTOS (${mesRef})${filterLabel}`;
    const boletos = await fetchBoletosWithRetry(client, {
      codigo_situacao: 2,
      mes_referente: mesRef,
    }, label);

    const stats = { filtradosCancel: 0, filtradosCtx: 0 };
    let totalCount = 0, totalVal = 0, hojeCount = 0, hojeVal = 0;

    for (const b of boletos) {
      if (!shouldCount(b, stats)) continue;

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
      `[Provider] ${label}: ${boletos.length} total (${stats.filtradosCancel} cancelados, ${stats.filtradosCtx} fora do filtro), ` +
      `${totalCount} válidos (R$ ${totalVal.toFixed(2)}), ${hojeCount} vencendo hoje`
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
