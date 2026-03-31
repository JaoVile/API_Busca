import { formatReportMessage } from '../../src/services/messageFormatter';

const report = {
  totalAtivos: 1250,
  vendasHoje: 5,
  canceladosHoje: 2,
  financeiro: { totalAberto: 50000, totalPago: 35000, percentualConversao: 70 },
  errors: [] as string[],
};

describe('formatReportMessage', () => {
  it('includes company name', () => {
    expect(formatReportMessage('Acme', report)).toContain('Acme');
  });

  it('formats 1250 with locale separator', () => {
    expect(formatReportMessage('X', report)).toContain('1.250');
  });

  it('pads single digits', () => {
    const msg = formatReportMessage('X', report);
    expect(msg).toContain('05');
    expect(msg).toContain('02');
  });

  it('shows percentage', () => {
    expect(formatReportMessage('X', report)).toContain('70%');
  });

  it('shows warning if errors', () => {
    const r = { ...report, errors: ['err1'] };
    expect(formatReportMessage('X', r)).toContain('erro(s)');
  });

  it('no warning if clean', () => {
    expect(formatReportMessage('X', report)).not.toContain('erro(s)');
  });
});
