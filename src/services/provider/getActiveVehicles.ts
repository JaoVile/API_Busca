import { AxiosInstance } from 'axios';
import { VehicleContext } from './vehicleContext';

/**
 * RF03 — Total de veículos com status ATIVO
 *
 * - Com VehicleContext (filtro regional/cooperativa ativo): devolve ctx.totalAtivos
 *   (já foi calculado durante o build do contexto, sem custo extra aqui).
 * - Sem contexto: consulta total_veiculos direto da API (1 req, rápido).
 */
export async function getActiveVehicles(
  client: AxiosInstance,
  ctx: VehicleContext | null
): Promise<number> {
  if (ctx) return ctx.totalAtivos;

  try {
    const response = await client.post('listar/veiculo', {
      codigo_situacao: 1,
      inicio_paginacao: 1,
      quantidade_por_pagina: 1,
    });
    return Number(response.data?.total_veiculos) || 0;
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
