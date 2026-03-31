import { ProviderReport } from './provider/providerTypes';

function currency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatReportMessage(
  companyName: string,
  report: ProviderReport
): string {
  const { totalAtivos, vendasHoje, canceladosHoje, financeiro } = report;

  const lines = [
    `📊 *Relatório Diário - ${companyName}*`,
    ``,
    `🚗 Ativos Totais: ${totalAtivos.toLocaleString('pt-BR')}`,
    `✅ Vendas hoje: ${pad(vendasHoje)}`,
    `❌ Cancelados hoje: ${pad(canceladosHoje)}`,
    ``,
    `💰 *Financeiro Mensal:*`,
    `  • Aberto: ${currency(financeiro.totalAberto)}`,
    `  • Pago: ${currency(financeiro.totalPago)} (${financeiro.percentualConversao}%)`,
  ];

  if (report.errors.length > 0) {
    lines.push('', `⚠️ _${report.errors.length} erro(s) parcial(is)_`);
  }

  return lines.join('\n');
}
