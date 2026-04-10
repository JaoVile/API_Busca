import { AxiosInstance } from 'axios';
import { VehicleContext } from './vehicleContext';

/**
 * RF04 — Veículos cadastrados na data atual (vendas do dia)
 *
 * - Com VehicleContext: devolve ctx.todaySalesCount (calculado no build).
 * - Sem contexto: consulta com filtro data_cadastro=hoje (1 req).
 */
export async function getTodaySales(
  client: AxiosInstance,
  ctx: VehicleContext | null
): Promise<number> {
  if (ctx) return ctx.todaySalesCount;

  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await client.post('listar/veiculo', {
      codigo_situacao: 1,
      data_cadastro: today,
      data_cadastro_final: today,
      inicio_paginacao: 1,
      quantidade_por_pagina: 1,
    });
    return Number(response.data?.total_veiculos) || 0;
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
