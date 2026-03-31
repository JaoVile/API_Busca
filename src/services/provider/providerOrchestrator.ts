import { authenticateProvider, createProviderClient } from './providerClient';
import { getActiveVehicles } from './getActiveVehicles';
import { getTodaySales } from './getTodaySales';
import { getTodayCancellations } from './getTodayCancellations';
import { getMonthlyFinancials } from './getMonthlyFinancials';
import { ProviderReport, FinancialSummary } from './providerTypes';

/**
 * Orquestra todas as chamadas Provider em paralelo
 * 1. Autentica (token SGA + user + pass → token_usuario)
 * 2. Faz as 4 consultas em paralelo com Promise.allSettled
 */
export async function fetchProviderReport(
  providerToken: string,
  usuario: string,
  senha: string
): Promise<ProviderReport> {
  // Etapa 1: autenticar e obter token_usuario
  const tokenUsuario = await authenticateProvider(providerToken, usuario, senha);
  const client = createProviderClient(tokenUsuario);

  const errors: string[] = [];
  const defaultFin: FinancialSummary = {
    totalAberto: 0,
    totalPago: 0,
    percentualConversao: 0,
  };

  let totalAtivos = 0;
  let vendasHoje = 0;
  let canceladosHoje = 0;
  let financeiro = defaultFin;

  // Etapa 2: 4 consultas em paralelo
  const [r1, r2, r3, r4] = await Promise.allSettled([
    getActiveVehicles(client),
    getTodaySales(client),
    getTodayCancellations(client),
    getMonthlyFinancials(client),
  ]);

  if (r1.status === 'fulfilled') totalAtivos = r1.value;
  else errors.push(r1.reason?.message || 'Erro ativos');

  if (r2.status === 'fulfilled') vendasHoje = r2.value;
  else errors.push(r2.reason?.message || 'Erro vendas');

  if (r3.status === 'fulfilled') canceladosHoje = r3.value;
  else errors.push(r3.reason?.message || 'Erro cancelamentos');

  if (r4.status === 'fulfilled') financeiro = r4.value;
  else errors.push(r4.reason?.message || 'Erro financeiro');

  return { totalAtivos, vendasHoje, canceladosHoje, financeiro, errors };
}
