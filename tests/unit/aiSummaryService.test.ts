import Anthropic from '@anthropic-ai/sdk';
import {
  generateExecutiveSummary,
  EXECUTIVE_SUMMARY_PROMPT_V1,
} from '../../src/services/ai/aiSummaryService';

jest.mock('@anthropic-ai/sdk');
const MockAnthropic = Anthropic as unknown as jest.Mock;

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

describe('generateExecutiveSummary', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...OLD_ENV };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('retorna null sem ANTHROPIC_API_KEY (recurso opcional)', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateExecutiveSummary('Acme', report);
    expect(result).toBeNull();
    expect(MockAnthropic).not.toHaveBeenCalled();
  });

  it('retorna o resumo quando a API responde', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '  Inadimplência alta no mês.  ' }],
    });
    MockAnthropic.mockImplementation(() => ({ messages: { create } }));

    const result = await generateExecutiveSummary('Acme', report);

    expect(result).toBe('Inadimplência alta no mês.'); // trim aplicado
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        system: EXECUTIVE_SUMMARY_PROMPT_V1,
      }),
    );
    // os números reais devem ir no conteúdo do usuário
    const callArg = create.mock.calls[0][0];
    expect(callArg.messages[0].content).toContain('1250');
  });

  it('retorna null quando a API falha (fallback não bloqueia o relatório)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const create = jest.fn().mockRejectedValue(new Error('timeout'));
    MockAnthropic.mockImplementation(() => ({ messages: { create } }));

    const result = await generateExecutiveSummary('Acme', report);
    expect(result).toBeNull();
  });

  it('retorna null quando a resposta vem sem texto', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const create = jest.fn().mockResolvedValue({ content: [] });
    MockAnthropic.mockImplementation(() => ({ messages: { create } }));

    const result = await generateExecutiveSummary('Acme', report);
    expect(result).toBeNull();
  });
});
