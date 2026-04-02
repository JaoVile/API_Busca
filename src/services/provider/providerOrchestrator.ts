import { authenticateProvider, createProviderClient } from './providerClient';
import { getActiveVehicles } from './getActiveVehicles';
import { getTodaySales } from './getTodaySales';
import { getTodayCancellations } from './getTodayCancellations';
import { getMonthlyFinancials } from './getMonthlyFinancials';
import { ProviderReport, FinancialSummary } from './providerTypes';

export async function fetchProviderReport(
  providerToken: string,
  usuario: string,
  senha: string
): Promise<ProviderReport> {
  const tokenUsuario = await authenticateProvider(providerToken, usuario, senha);
  const client = createProviderClient(tokenUsuario);

  const errors: string[] = [];
  const defaultFin: FinancialSummary = {
    recebidoHoje: 0,
    qtdRecebidoHoje: 0,
    abertoHoje: 0,
    qtdAbertoHoje: 0,
    pagoMes: 0,
    qtdPagoMes: 0,
    abertoMes: 0,
    qtdAbertoMes: 0,
  };

  let totalAtivos = 0;
  let vendasHoje = 0;
  let canceladosHoje = 0;
  let financeiro = defaultFin;

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
