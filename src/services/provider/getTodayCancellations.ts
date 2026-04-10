import { AxiosInstance } from 'axios';

const PAGE_SIZE = 500;
const MAX_PAGES = 200;

// Cache dos códigos de situação de cancelamento (não muda durante a execução)
let cancelSituationCodes: string[] | null = null;

async function fetchCancelSituationCodes(client: AxiosInstance): Promise<string[]> {
  if (cancelSituationCodes) return cancelSituationCodes;

  const response = await client.get('/listar/situacao/todos');
  const situacoes = Array.isArray(response.data) ? response.data : [];

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
 * Busca todos os codigo_veiculo da regional com a situação informada.
 * Paginação offset 1-indexed, qp=500.
 */
async function fetchVehicleIdsByRegional(
  client: AxiosInstance,
  codigoSituacao: string,
  codigoRegional: string
): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 1;
  let pagesFetched = 0;

  while (pagesFetched < MAX_PAGES) {
    try {
      const response = await client.post('listar/veiculo', {
        codigo_situacao: Number(codigoSituacao),
        inicio_paginacao: offset,
        quantidade_por_pagina: PAGE_SIZE,
      }, { timeout: 60000 });

      const data = response.data;
      const veiculos = Array.isArray(data) ? data : (data?.veiculos ?? []);

      for (const v of veiculos) {
        if (String(v.codigo_regional) === codigoRegional) {
          ids.add(String(v.codigo_veiculo));
        }
      }

      pagesFetched++;
      if (veiculos.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    } catch (e: any) {
      if (e.response?.status === 406) break; // sem mais dados
      throw e;
    }
  }

  return ids;
}

/**
 * RF05 — Cancelamentos do dia
 *
 * 1. Busca os códigos de situação que representam cancelamento (CANCELADO / PRE-CANCELAMENTO)
 * 2. Consulta POST /listar/alteracao-veiculos para as alterações do dia
 * 3. Filtra apenas as mudanças cujo valor_posterior é um código de cancelamento
 * 4. Se codigoRegional informado: cruza com os veículos da regional
 *    (cancelamentos não têm codigo_regional no payload de alteração)
 */
export async function getTodayCancellations(
  client: AxiosInstance,
  codigoRegional?: string | null
): Promise<number> {
  try {
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

    const response = await client.post('/listar/alteracao-veiculos', {
      data_inicial: today,
      data_final: today,
      campos: ['codigo_situacao'],
      valor_posterior: cancelCodes,
    });

    const items = Array.isArray(response.data) ? response.data : [];

    const cancelados = items.filter((item: any) => {
      const campo = (item.nome_campo_tabela || '').toLowerCase();
      if (campo !== 'codigo_situacao') return false;
      return cancelCodes.includes(String(item.valor_posterior));
    });

    if (!codigoRegional) {
      console.log(
        `[Provider] Cancelamentos do dia: ${cancelados.length} de ${items.length} alterações totais`
      );
      return cancelados.length;
    }

    // Filtro por regional: cruzar codigo_veiculo com os veículos cancelados da regional
    const target = String(codigoRegional);
    const regionalVehicles = new Set<string>();

    for (const cod of cancelCodes) {
      const ids = await fetchVehicleIdsByRegional(client, cod, target);
      for (const id of ids) regionalVehicles.add(id);
    }

    const filtered = cancelados.filter((c: any) => regionalVehicles.has(String(c.codigo_veiculo)));

    console.log(
      `[Provider] Cancelamentos do dia (regional ${target}): ${filtered.length} de ${cancelados.length} totais`
    );

    return filtered.length;
  } catch (error: any) {
    if (error.response?.status === 406) {
      console.log('[Provider] Cancelamentos do dia: 0 (406 - sem dados)');
      return 0;
    }
    throw new Error(
      `Provider Cancelamentos: ${error.response?.status || ''} ${error.message}`
    );
  }
}
