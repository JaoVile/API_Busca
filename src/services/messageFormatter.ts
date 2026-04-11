import { ProviderReport } from './provider/providerTypes';

function currency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')}mi`;
  }
  if (value >= 100_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function num(n: number): string {
  return n.toLocaleString('pt-BR');
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

export const DEFAULT_TEMPLATE = `📊 *Relatório Diário — {{empresa}}*
📅 {{data}}

🚗 *Resumo do Dia*
  • Ativos: {{ativos}}
  • Vendas hoje: {{vendasHoje}}
  • Cancelados hoje: {{canceladosHoje}}

📋 *Financeiro Hoje*
  • Recebido: {{recebidoHoje}} ({{qtdRecebidoHoje}} boletos) — {{pctRecebidoHoje}}
  • Em aberto: {{abertoHoje}} ({{qtdAbertoHoje}} boletos) — {{pctAbertoHoje}}
  • Total: {{totalDia}} ({{qtdTotalDia}} boletos)

💰 *Financeiro do Mês — {{mesAno}}*
  • Recebido: {{pagoMes}} ({{qtdPagoMes}} boletos) — {{pctPagoMes}}
  • Em aberto: {{abertoMes}} ({{qtdAbertoMes}} boletos) — {{pctAbertoMes}}
  • Total: {{totalMes}} ({{qtdTotalMes}} boletos)`;

export function formatReportMessage(
  companyName: string,
  report: ProviderReport,
  customTemplate?: string | null
): string {
  const { totalAtivos, vendasHoje, canceladosHoje, financeiro } = report;

  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' });
  const ano = now.getFullYear();

  const totalDia = financeiro.recebidoHoje + financeiro.abertoHoje;
  const totalMes = financeiro.pagoMes + financeiro.abertoMes;

  const vars: Record<string, string> = {
    empresa: companyName,
    data: now.toLocaleDateString('pt-BR'),
    mesAno: `${mesNome} ${ano}`,
    periodo: `dia 01 ao dia ${dia}`,
    ativos: num(totalAtivos),
    vendasHoje: num(vendasHoje),
    canceladosHoje: num(canceladosHoje),
    recebidoHoje: currency(financeiro.recebidoHoje),
    qtdRecebidoHoje: num(financeiro.qtdRecebidoHoje),
    abertoHoje: currency(financeiro.abertoHoje),
    qtdAbertoHoje: num(financeiro.qtdAbertoHoje),
    pctRecebidoHoje: pct(financeiro.recebidoHoje, totalDia),
    pctAbertoHoje: pct(financeiro.abertoHoje, totalDia),
    totalDia: currency(totalDia),
    qtdTotalDia: num(financeiro.qtdRecebidoHoje + financeiro.qtdAbertoHoje),
    pagoMes: currency(financeiro.pagoMes),
    qtdPagoMes: num(financeiro.qtdPagoMes),
    abertoMes: currency(financeiro.abertoMes),
    qtdAbertoMes: num(financeiro.qtdAbertoMes),
    pctPagoMes: pct(financeiro.pagoMes, totalMes),
    pctAbertoMes: pct(financeiro.abertoMes, totalMes),
    totalMes: currency(totalMes),
    qtdTotalMes: num(financeiro.qtdPagoMes + financeiro.qtdAbertoMes),
  };

  const template = customTemplate || DEFAULT_TEMPLATE;
  let message = template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

  if (report.errors.length > 0) {
    message += `\n\n⚠️ _${report.errors.length} erro(s) parcial(is)_`;
  }

  return message;
}
