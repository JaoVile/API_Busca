import { AxiosInstance } from 'axios';

/**
 * Contexto de filtragem construído UMA VEZ por pipeline run e compartilhado
 * entre todos os fetchers. Evita que cada um pagine veículos independentemente.
 *
 * Só é construído quando há pelo menos um filtro (regional ou cooperativa).
 * Quando nenhum filtro está ativo, fetchers usam o caminho rápido (total_veiculos
 * direto da resposta da API, sem paginar).
 *
 * O helper pagina TODOS os veículos com codigo_situacao=1 (ATIVOS) e coleta:
 *  - allowedAssociados: codigo_associado de cada veículo que bate com o filtro
 *  - allowedVeiculos: codigo_veiculo de cada veículo que bate com o filtro
 *  - totalAtivos: contagem de veículos (= RF03 Ativos)
 *  - todaySalesCount: contagem de veículos cadastrados hoje (= RF04 Vendas)
 *
 * Paginação: listar/veiculo usa `inicio_paginacao` como OFFSET 1-indexed de linha.
 */

export interface VehicleFilter {
  codigoRegional?: string | null;
  codigoCooperativa?: string | null;
}

export interface VehicleContext {
  filter: VehicleFilter;
  allowedAssociados: Set<string>;
  allowedVeiculos: Set<string>;
  totalAtivos: number;
  todaySalesCount: number;
}

const PAGE_SIZE = 500;
const MAX_PAGES = 200; // até 100.000 veículos

export async function buildVehicleContext(
  client: AxiosInstance,
  filter: VehicleFilter
): Promise<VehicleContext | null> {
  if (!filter.codigoRegional && !filter.codigoCooperativa) return null;

  const ctx: VehicleContext = {
    filter,
    allowedAssociados: new Set(),
    allowedVeiculos: new Set(),
    totalAtivos: 0,
    todaySalesCount: 0,
  };

  const today = new Date().toISOString().split('T')[0];
  const seen = new Set<string>();
  let offset = 1;
  let pagesFetched = 0;

  while (pagesFetched < MAX_PAGES) {
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await client.post('listar/veiculo', {
          codigo_situacao: 1,
          inicio_paginacao: offset,
          quantidade_por_pagina: PAGE_SIZE,
        }, { timeout: 300000 });
        break;
      } catch (e: any) {
        if (e.response?.status === 406) {
          return finalize(ctx);
        }
        if (attempt === 3) throw e;
        await new Promise(r => setTimeout(r, 3000 * attempt));
      }
    }
    if (!response) break;

    const data = response.data;
    const veiculos = Array.isArray(data) ? data : (data?.veiculos ?? []);

    for (const v of veiculos) {
      const id = String(v.codigo_veiculo);
      if (seen.has(id)) continue;
      seen.add(id);

      if (filter.codigoRegional && String(v.codigo_regional) !== String(filter.codigoRegional)) continue;
      if (filter.codigoCooperativa && String(v.codigo_cooperativa) !== String(filter.codigoCooperativa)) continue;

      ctx.allowedVeiculos.add(id);
      if (v.codigo_associado) ctx.allowedAssociados.add(String(v.codigo_associado));
      ctx.totalAtivos++;

      const dc = String(v.data_cadastro || '').substring(0, 10);
      if (dc === today) ctx.todaySalesCount++;
    }

    pagesFetched++;
    if (veiculos.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return finalize(ctx);
}

function finalize(ctx: VehicleContext): VehicleContext {
  const f = [
    ctx.filter.codigoRegional ? `regional=${ctx.filter.codigoRegional}` : null,
    ctx.filter.codigoCooperativa ? `cooperativa=${ctx.filter.codigoCooperativa}` : null,
  ].filter(Boolean).join(', ');
  console.log(
    `[Provider] VehicleContext (${f}): ${ctx.totalAtivos} ativos, ` +
    `${ctx.allowedAssociados.size} associados únicos, ${ctx.todaySalesCount} cadastrados hoje`
  );
  return ctx;
}
