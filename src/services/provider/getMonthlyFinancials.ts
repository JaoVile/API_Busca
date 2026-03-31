import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';

/**
 * RF06 + RN01 — Boletos do mês atual (dia 01 até último dia)
 * POST /listar/boleto-associado/periodo
 * Formato datas: dd/mm/yyyy
 * Limite intervalo: 31 dias (ok pra 1 mês)
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

    let allBoletos: any[] = [];
    let page = 0;
    const pageSize = 5000;
    let hasMore = true;

    // Paginação: busca todos os boletos do mês
    while (hasMore) {
      const response = await client.post('/listar/boleto-associado/periodo', {
        data_vencimento_inicial: startDate,
        data_vencimento_final: endDate,
        inicio_paginacao: page,
        quantidade_por_pagina: pageSize,
      });

      const boletos = response.data?.boletos ?? response.data ?? [];
      const items = Array.isArray(boletos) ? boletos : [];

      allBoletos = allBoletos.concat(items);

      // Se retornou menos que o pageSize, não tem mais páginas
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }

      // Segurança: máximo 10 páginas (50k boletos)
      if (page >= 10) hasMore = false;
    }

    let totalAberto = 0;
    let totalPago = 0;
    let boletosBaixados = 0;

    for (const boleto of allBoletos) {
      const valor = parseFloat(
        String(boleto.valor_boleto || '0').replace(',', '.')
      ) || 0;

      const situacao = (boleto.situacao_boleto || '').toUpperCase();

      if (situacao === 'BAIXADO' || situacao === 'PAGO') {
        totalPago += valor;
        boletosBaixados++;
      } else {
        totalAberto += valor;
      }
    }

    const total = allBoletos.length;
    const percentualConversao =
      total > 0 ? Math.round((boletosBaixados / total) * 100) : 0;

    return { totalAberto, totalPago, percentualConversao };
  } catch (error: any) {
    throw new Error(
      `Provider Financeiro: ${error.response?.status || ''} ${error.message}`
    );
  }
}
