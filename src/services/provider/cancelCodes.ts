import { AxiosInstance } from 'axios';

/**
 * Busca na Provider os códigos de situação que representam cancelamento
 * (CANCELADO, PRE-CANCELAMENTO). O resultado é cacheado em memória durante
 * a execução do processo porque a lista de situações não muda entre chamadas.
 */

let cache: string[] | null = null;

export async function fetchCancelSituationCodes(client: AxiosInstance): Promise<string[]> {
  if (cache) return cache;

  const response = await client.get('/listar/situacao/todos');
  const situacoes = Array.isArray(response.data) ? response.data : [];

  cache = situacoes
    .filter((s: any) => {
      const desc = (s.descricao_situacao || '').toUpperCase();
      return desc === 'CANCELADO' || desc === 'PRE-CANCELAMENTO';
    })
    .map((s: any) => String(s.codigo_situacao));

  console.log(
    `[Provider] Situações de cancelamento: ${JSON.stringify(
      situacoes
        .filter((s: any) => cache!.includes(String(s.codigo_situacao)))
        .map((s: any) => ({ cod: s.codigo_situacao, desc: s.descricao_situacao }))
    )}`
  );

  return cache;
}
