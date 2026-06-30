import Anthropic from '@anthropic-ai/sdk';
import { ProviderReport } from '../provider/providerTypes';

// Modelo barato/rápido — resumo executivo é uma tarefa simples e de baixo custo.
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 320;
const TIMEOUT_MS = 15_000; // SDK TypeScript usa milissegundos

// Prompt versionado: facilita comparar mudanças de comportamento ao longo do tempo.
export const EXECUTIVE_SUMMARY_PROMPT_V1 = [
  'Você é um analista de gestão de frota veicular.',
  'Receberá os números do relatório diário de uma associação/cooperativa e deve',
  'escrever um INSIGHT EXECUTIVO curto (1 a 2 frases, máximo ~40 palavras) em',
  'português do Brasil, destacando o que mais chama atenção ou exige ação',
  '(ex.: alta inadimplência, queda de vendas, pico de cancelamentos).',
  '',
  'Regras:',
  '- Use SOMENTE os números fornecidos. Nunca invente dados, percentuais ou tendências.',
  '- Não repita todos os números; aponte o que importa.',
  '- Tom direto e profissional. Sem saudações, emojis ou markdown.',
].join('\n');

function buildMetricsBlock(companyName: string, report: ProviderReport): string {
  const f = report.financeiro;
  return [
    `Empresa: ${companyName}`,
    `Veículos ativos: ${report.totalAtivos}`,
    `Vendas hoje: ${report.vendasHoje}`,
    `Cancelamentos hoje: ${report.canceladosHoje}`,
    `Recebido hoje: R$ ${f.recebidoHoje} (${f.qtdRecebidoHoje} boletos)`,
    `Em aberto hoje: R$ ${f.abertoHoje} (${f.qtdAbertoHoje} boletos)`,
    `Recebido no mês: R$ ${f.pagoMes} (${f.qtdPagoMes} boletos)`,
    `Em aberto no mês: R$ ${f.abertoMes} (${f.qtdAbertoMes} boletos)`,
  ].join('\n');
}

/**
 * Gera um insight executivo do relatório via Claude.
 *
 * É um recurso OPCIONAL: se `ANTHROPIC_API_KEY` não estiver configurada, ou se a
 * chamada falhar/exceder o timeout, retorna `null` — o pipeline segue e envia o
 * relatório normalmente, sem o resumo. A IA nunca bloqueia a função principal.
 */
export async function generateExecutiveSummary(
  companyName: string,
  report: ProviderReport,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: EXECUTIVE_SUMMARY_PROMPT_V1,
      messages: [{ role: 'user', content: buildMetricsBlock(companyName, report) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const summary = textBlock && 'text' in textBlock ? textBlock.text.trim() : '';
    return summary.length > 0 ? summary : null;
  } catch (err: any) {
    // Degrada com elegância: loga e segue sem o resumo.
    console.error(`[AI] Falha ao gerar resumo executivo: ${err?.message ?? err}`);
    return null;
  }
}
