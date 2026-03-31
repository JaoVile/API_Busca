import { AxiosInstance } from 'axios';

/**
 * RF03 — Total de veículos com status ATIVO
 * POST listar/veiculo  { codigo_situacao: 1 }
 * Retorna total_veiculos do response
 */
export async function getActiveVehicles(client: AxiosInstance): Promise<number> {
  try {
    const response = await client.post('listar/veiculo', {
      codigo_situacao: 1,
      inicio_paginacao: 0,
      quantidade_por_pagina: 1,
    });

    return Number(response.data?.total_veiculos) || 0;
  } catch (error: any) {
    throw new Error(
      `Provider Ativos: ${error.response?.status || ''} ${error.message}`
    );
  }
}
