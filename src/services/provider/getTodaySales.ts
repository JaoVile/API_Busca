import { AxiosInstance } from 'axios';

const PAGE_SIZE = 500;
const MAX_PAGES = 50;

/**
 * RF04 — Veículos cadastrados na data atual (vendas do dia)
 *
 * POST listar/veiculo  { codigo_situacao: 1, data_cadastro/data_cadastro_final }
 * Formato data_cadastro: Y-m-d.
 *
 * - Sem codigoRegional: conta via total_veiculos (1 req).
 * - Com codigoRegional: pagina e filtra client-side.
 */
export async function getTodaySales(
  client: AxiosInstance,
  codigoRegional?: string | null
): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const body = {
      codigo_situacao: 1,
      data_cadastro: today,
      data_cadastro_final: today,
    };

    if (!codigoRegional) {
      const response = await client.post('listar/veiculo', {
        ...body,
        inicio_paginacao: 1,
        quantidade_por_pagina: 1,
      });
      return Number(response.data?.total_veiculos) || 0;
    }

    const target = String(codigoRegional);
    let count = 0;
    let offset = 1;
    let pagesFetched = 0;

    while (pagesFetched < MAX_PAGES) {
      const response = await client.post('listar/veiculo', {
        ...body,
        inicio_paginacao: offset,
        quantidade_por_pagina: PAGE_SIZE,
      }, { timeout: 60000 });

      const data = response.data;
      const veiculos = Array.isArray(data) ? data : (data?.veiculos ?? []);

      for (const v of veiculos) {
        if (String(v.codigo_regional) === target) count++;
      }

      pagesFetched++;
      if (veiculos.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    console.log(`[Provider] Vendas do dia (regional ${target}): ${count}`);
    return count;
  } catch (error: any) {
    if (error.response?.status === 406) {
      console.log('[Provider] Vendas do dia: 0 (406 - sem dados)');
      return 0;
    }
    throw new Error(
      `Provider Vendas: ${error.response?.status || ''} ${error.message}`
    );
  }
}
