import { AxiosInstance } from 'axios';
import { FinancialSummary } from './providerTypes';

/**
 * RF06 — Resumo financeiro do mês atual + dia atual
 * Usa mes_referente para buscar todos os boletos do mês corrente.
 * Extrai dados diários comparando data_pagamento / data_vencimento com hoje.
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

function parseDate(dateStr: string): string {
  // Normaliza dd/mm/yyyy para yyyy-mm-dd para comparação
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr.substring(0, 10); // yyyy-mm-dd
}

async function fetchBoletos(
  client: AxiosInstance,
  codSituacao: number,
  mesReferente: string,
  hojeISO: string,
  label: string,
  campoData: string,
  usePagamento: boolean
): Promise<MesResult> {
  let result: MesResult = { count: 0, total: 0, countHoje: 0, totalHoje: 0 };
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await client.post('listar/boleto', {
      codigo_situacao: codSituacao,
      mes_referente: mesReferente,
      inicio_paginacao: page,
      quantidade_por_pagina: 5000,
    }, { timeout: 300000 });

    const data = response.data;
    const boletos = Array.isArray(data) ? data : (data?.boletos ?? []);

    for (const b of boletos) {
      const campo = usePagamento
        ? (b.valor_pagamento || b.valor_boleto || '0')
        : (b.valor_boleto || '0');
      const valor = parseFloat(String(campo).replace(',', '.')) || 0;

      result.count++;
      result.total += valor;

      // Verifica se é de hoje
      const dataBoleto = parseDate(b[campoData] || '');
      if (dataBoleto === hojeISO) {
        result.countHoje++;
        result.totalHoje += valor;
      }
    }

    hasMore = boletos.length >= 5000;
    page++;
    if (page >= 10) hasMore = false;
  }

  console.log(
    `[Provider] ${label} (${mesReferente}): ${result.count} boletos total, ${result.countHoje} hoje, R$ ${result.total.toFixed(2)}`
  );
  return result;
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

  let pagos: MesResult = { count: 0, total: 0, countHoje: 0, totalHoje: 0 };
  let abertos: MesResult = { count: 0, total: 0, countHoje: 0, totalHoje: 0 };

  try {
    pagos = await fetchBoletos(client, 1, mesRef, hojeISO, 'BAIXADOS', 'data_pagamento', true);
  } catch (e: any) {
    if (e.response?.status !== 406) {
      console.error(`[Provider] Erro BAIXADOS: ${e.message}`);
      errors.push('baixados');
    }
  }

  try {
    abertos = await fetchBoletos(client, 2, mesRef, hojeISO, 'ABERTOS', 'data_vencimento', false);
  } catch (e: any) {
    if (e.response?.status !== 406) {
      console.error(`[Provider] Erro ABERTOS: ${e.message}`);
      errors.push('abertos');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Provider Financeiro: falha em ${errors.join(', ')}`);
  }

  return {
    recebidoHoje: pagos.totalHoje,
    qtdRecebidoHoje: pagos.countHoje,
    abertoHoje: abertos.totalHoje,
    qtdAbertoHoje: abertos.countHoje,
    pagoMes: pagos.total,
    qtdPagoMes: pagos.count,
    abertoMes: abertos.total,
    qtdAbertoMes: abertos.count,
  };
}
