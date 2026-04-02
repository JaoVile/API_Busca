import { AxiosInstance } from 'axios';

// Cache dos códigos de situação de cancelamento (não muda durante a execução)
let cancelSituationCodes: string[] | null = null;

/**
 * Busca todas as situações de veículo na Provider e retorna os códigos
 * cujas descrições indicam cancelamento.
 * GET /listar/situacao/ativo retorna: { codigo_situacao, descricao_situacao, ... }
 */
async function fetchCancelSituationCodes(client: AxiosInstance): Promise<string[]> {
  if (cancelSituationCodes) return cancelSituationCodes;

  const response = await client.get('/listar/situacao/todos');
  const situacoes = Array.isArray(response.data) ? response.data : [];

  // Filtrar situações que sejam explicitamente "CANCELADO" ou "PRE-CANCELAMENTO"
  cancelSituationCodes = situacoes
    .filter((s: any) => {
      const desc = (s.descricao_situacao || '').toUpperCase();
      return desc === 'CANCELADO' || desc === 'PRE-CANCELAMENTO';
    })
    .map((s: any) => String(s.codigo_situacao));

  console.log(
    `[Provider] Situações de cancelamento encontradas: ${JSON.stringify(
      situacoes
        .filter((s: any) => cancelSituationCodes!.includes(String(s.codigo_situacao)))
        .map((s: any) => ({ cod: s.codigo_situacao, desc: s.descricao_situacao }))
    )}`
  );

  return cancelSituationCodes;
}

/**
 * RF05 — Cancelamentos do dia
 * 1. Busca os códigos de situação que representam cancelamento
 * 2. Consulta POST /listar/alteracao-veiculos filtrando por codigo_situacao
 * 3. Filtra apenas registros onde valor_posterior é um código de cancelamento
 * Formato datas: dd/mm/yyyy (conforme doc Provider)
 */
export async function getTodayCancellations(client: AxiosInstance): Promise<number> {
  try {
    // 1. Descobrir quais codigos_situacao são cancelamento
    const cancelCodes = await fetchCancelSituationCodes(client);

    if (cancelCodes.length === 0) {
      console.warn('[Provider] Nenhuma situação de cancelamento encontrada, retornando 0');
      return 0;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const today = `${dd}/${mm}/${yyyy}`;

    // 2. Buscar alterações de veículos do dia, filtrando por codigo_situacao
    //    e usando valor_posterior para pegar apenas quem MUDOU PARA cancelado
    const response = await client.post('/listar/alteracao-veiculos', {
      data_inicial: today,
      data_final: today,
      campos: ['codigo_situacao'],
      valor_posterior: cancelCodes,
    });

    const items = Array.isArray(response.data) ? response.data : [];

    // 3. Filtrar: campo deve ser codigo_situacao E valor_posterior em cancelCodes
    const cancelados = items.filter((item: any) => {
      const campo = (item.nome_campo_tabela || '').toLowerCase();
      if (campo !== 'codigo_situacao') return false;
      return cancelCodes.includes(String(item.valor_posterior));
    });

    console.log(
      `[Provider] Cancelamentos do dia: ${cancelados.length} de ${items.length} alterações totais`
    );

    return cancelados.length;
  } catch (error: any) {
    throw new Error(
      `Provider Cancelamentos: ${error.response?.status || ''} ${error.message}`
    );
  }
}
