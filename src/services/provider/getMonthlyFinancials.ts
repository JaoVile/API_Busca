import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';

/**
 * RF06 + RN01 — Boletos do mês atual (dia 01 até último dia)
 * POST /listar/boleto
 * Requer codigo_situacao + filtro de data vencimento
 * Formato datas: dd/mm/yyyy
 */
export async function getMonthlyFinancials(
  client: AxiosInstance
): Promise<FinancialSummary> {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();

    const startDate = `01/${mm}/${yyyy}`;
    const endDate = `${String(lastDay).padStart(2, '0')}/${mm}/${yyyy}`;

    let totalAberto = 0;
    let totalPago = 0;
    let boletosBaixados = 0;
    let totalBoletos = 0;

    // Buscar boletos ABERTOS do mês (situacao 2 = ABERTO geralmente)
    // e BAIXADOS (situacao 3 = BAIXADO)
    // Usamos o endpoint listar/boleto que aceita filtros por data
    for (const codSituacao of [2, 3]) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await client.post('listar/boleto', {
          codigo_situacao: codSituacao,
          data_vencimento_inicial: startDate,
          data_vencimento_final: endDate,
          inicio_paginacao: page,
          quantidade_por_pagina: 1000,
        });

        const data = response.data;
        const boletos = Array.isArray(data) ? data : (data?.boletos ?? data?.dados ?? []);

        for (const boleto of boletos) {
          const valor = parseFloat(
            String(boleto.valor_boleto || boleto.valor || '0').replace(',', '.')
          ) || 0;

          totalBoletos++;

          if (codSituacao === 3) {
            totalPago += valor;
            boletosBaixados++;
          } else {
            totalAberto += valor;
          }
        }

        if (boletos.length < 1000) {
          hasMore = false;
        } else {
          page++;
        }

        if (page >= 10) hasMore = false;
      }
    }

    const percentualConversao =
      totalBoletos > 0 ? Math.round((boletosBaixados / totalBoletos) * 100) : 0;

    return { totalAberto, totalPago, percentualConversao };
  } catch (error: any) {
    throw new Error(
      `Provider Financeiro: ${error.response?.status || ''} ${error.message}`
    );
  }
}
