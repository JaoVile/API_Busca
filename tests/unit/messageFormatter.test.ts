import { formatReportMessage, DEFAULT_TEMPLATE } from '../../src/services/messageFormatter';

const report = {
  totalAtivos: 1250,
  vendasHoje: 5,
  canceladosHoje: 2,
  financeiro: {
    recebidoHoje: 5000,
    qtdRecebidoHoje: 10,
    abertoHoje: 3000,
    qtdAbertoHoje: 6,
    pagoMes: 30000,
    qtdPagoMes: 60,
    abertoMes: 20000,
    qtdAbertoMes: 40,
  },
  errors: [] as string[],
};

describe('formatReportMessage', () => {
  it('includes company name', () => {
    expect(formatReportMessage('Acme', report)).toContain('Acme');
  });

  it('formats 1250 with locale separator', () => {
    expect(formatReportMessage('X', report)).toContain('1.250');
  });

  it('shows daily and monthly sections', () => {
    const msg = formatReportMessage('X', report);
    expect(msg).toContain('Financeiro Hoje');
    expect(msg).toContain('Financeiro do Mês');
  });

  it('shows percentages', () => {
    const msg = formatReportMessage('X', report);
    expect(msg).toContain('%');
  });

  it('shows warning if errors', () => {
    const r = { ...report, errors: ['err1'] };
    expect(formatReportMessage('X', r)).toContain('erro(s)');
  });

  it('no warning if clean', () => {
    expect(formatReportMessage('X', report)).not.toContain('erro(s)');
  });

  it('uses custom template when provided', () => {
    const tpl = 'Olá {{empresa}} — Ativos: {{ativos}}';
    const msg = formatReportMessage('Acme', report, tpl);
    expect(msg).toBe('Olá Acme — Ativos: 1.250');
  });

  it('falls back to default when template is null', () => {
    const msg = formatReportMessage('X', report, null);
    expect(msg).toContain('Relatório Diário');
  });

  it('exports DEFAULT_TEMPLATE', () => {
    expect(DEFAULT_TEMPLATE).toContain('{{empresa}}');
  });
});
