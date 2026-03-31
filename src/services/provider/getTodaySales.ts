import { AxiosInstance } from 'axios';

/**
 * RF04 — Veículos cadastrados na data atual (vendas do dia)
 * POST listar/veiculo  { codigo_situacao: 1, data_cadastro/data_cadastro_final: hoje }
 * Formato data_cadastro: Y-m-d (conforme doc Provider)
 */
export async function getTodaySales(client: AxiosInstance): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

    const response = await client.post('listar/veiculo', {
      codigo_situacao: 1,
      data_cadastro: today,
      data_cadastro_final: today,
      inicio_paginacao: 0,
      quantidade_por_pagina: 1,
    });

    return Number(response.data?.total_veiculos) || 0;
  } catch (error: any) {
    throw new Error(
      `Provider Vendas: ${error.response?.status || ''} ${error.message}`
    );
  }
}
