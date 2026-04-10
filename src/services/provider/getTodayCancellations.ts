import { AxiosInstance } from 'axios';
import { VehicleContext } from './vehicleContext';
import { fetchCancelSituationCodes } from './cancelCodes';

/**
 * RF05 — Cancelamentos do dia
 *
 * 1. Busca códigos de situação que representam cancelamento (CANCELADO / PRE-CANCELAMENTO)
 * 2. Consulta POST /listar/alteracao-veiculos para alterações do dia
 * 3. Filtra apenas mudanças cujo valor_posterior é um código de cancelamento
 * 4. Se houver VehicleContext: intersecta com ctx.allowedVeiculos.
 *    Importante: allowedVeiculos contém apenas veículos com codigo_situacao=1 (ativos).
 *    Um veículo que foi cancelado hoje NÃO está mais em allowedVeiculos. Então o
 *    filtro aqui serve só quando o cancelamento ocorreu mas o veículo ainda aparece
 *    como ativo no snapshot — casos raros. Para robustez, usamos cruzamento por
 *    codigo_veiculo das alterações de cancelamento.
 */
export async function getTodayCancellations(
  client: AxiosInstance,
  ctx: VehicleContext | null
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

    if (!ctx) {
      console.log(
        `[Provider] Cancelamentos do dia: ${cancelados.length} de ${items.length} alterações totais`
      );
      return cancelados.length;
    }

    // Com contexto: precisamos cruzar com veículos que PERTENCIAM ao filtro
    // antes de serem cancelados. Como allowedVeiculos só tem ativos atuais,
    // buscamos os veículos cancelados da cooperativa/regional e cruzamos.
    // Para simplificar, buscamos os veículos com codigo_situacao de cancelamento
    // e filtramos pelos mesmos critérios do contexto.
    const filter = ctx.filter;
    const cancelVehicleIds = new Set<string>();

    for (const cod of cancelCodes) {
      let offset = 1;
      while (offset < 100000) {
        try {
          const r = await client.post('listar/veiculo', {
            codigo_situacao: Number(cod),
            inicio_paginacao: offset,
            quantidade_por_pagina: 500,
          }, { timeout: 180000 });
          const vs = Array.isArray(r.data) ? r.data : (r.data?.veiculos ?? []);
          for (const v of vs) {
            if (filter.codigoRegional && String(v.codigo_regional) !== String(filter.codigoRegional)) continue;
            if (filter.codigoCooperativa && String(v.codigo_cooperativa) !== String(filter.codigoCooperativa)) continue;
            cancelVehicleIds.add(String(v.codigo_veiculo));
          }
          if (vs.length < 500) break;
          offset += 500;
        } catch (e: any) {
          if (e.response?.status === 406) break;
          throw e;
        }
      }
    }

    const filtered = cancelados.filter((c: any) => cancelVehicleIds.has(String(c.codigo_veiculo)));

    console.log(
      `[Provider] Cancelamentos do dia (filtrado): ${filtered.length} de ${cancelados.length} totais`
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
