import { AxiosInstance } from 'axios';

const PAGE_SIZE = 500;
const MAX_PAGES = 200; // suporta até 100.000 veículos

/**
 * RF03 — Total de veículos com status ATIVO
 *
 * POST listar/veiculo  { codigo_situacao: 1 }
 *
 * - Sem codigoRegional: retorna o total_veiculos direto da API (1 req).
 * - Com codigoRegional: pagina TODOS os veículos e conta client-side (o
 *   parâmetro codigo_regional no body NÃO é respeitado pela API).
 *
 * Paginação de listar/veiculo: `inicio_paginacao` é OFFSET de linha
 * 1-indexed (não número de página). Com qp=500: 1, 501, 1001, ...
 */
export async function getActiveVehicles(
  client: AxiosInstance,
  codigoRegional?: string | null
): Promise<number> {
  try {
    if (!codigoRegional) {
      const response = await client.post('listar/veiculo', {
        codigo_situacao: 1,
        inicio_paginacao: 1,
        quantidade_por_pagina: 1,
      });
      return Number(response.data?.total_veiculos) || 0;
    }

    // Filtro por regional: paginar tudo, contar client-side
    const target = String(codigoRegional);
    let count = 0;
    let offset = 1;
    let pagesFetched = 0;

    while (pagesFetched < MAX_PAGES) {
      const response = await client.post('listar/veiculo', {
        codigo_situacao: 1,
        inicio_paginacao: offset,
        quantidade_por_pagina: PAGE_SIZE,
      }, { timeout: 120000 });

      const data = response.data;
      const veiculos = Array.isArray(data) ? data : (data?.veiculos ?? []);

      for (const v of veiculos) {
        if (String(v.codigo_regional) === target) count++;
      }

      pagesFetched++;
      if (veiculos.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    console.log(`[Provider] Ativos (regional ${target}): ${count}`);
    return count;
  } catch (error: any) {
    if (error.response?.status === 406) {
      console.log('[Provider] Ativos: 0 (406 - sem dados)');
      return 0;
    }
    throw new Error(
      `Provider Ativos: ${error.response?.status || ''} ${error.message}`
    );
  }
}
