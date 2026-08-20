import { CredentialsService } from '../services/credentialsService';
import { fetchProviderReport } from '../services/provider/providerOrchestrator';
import { formatReportMessage } from '../services/messageFormatter';
import { generateExecutiveSummary } from '../services/ai/aiSummaryService';
import { sendWhatsAppMessage } from '../services/quepasa/sendMessage';
import { ReportLogService } from '../services/reportLogService';
import prisma from '../database/prismaClient';

const credentialsService = new CredentialsService();
const logService = new ReportLogService();

export async function runReportForTenant(tenantId: string): Promise<void> {
  console.log(`[PIPELINE] Tenant: ${tenantId}`);

  try {
    // 1. AUTH - buscar credenciais
    const creds = await credentialsService.getDecrypted(tenantId);
    if (!creds) {
      await logService.log(tenantId, 'FAILURE', undefined, 'Sem credenciais');
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { companyName: true },
    });

    // 2. FETCH - buscar dados do provedor
    const report = await fetchProviderReport(
      creds.providerToken,
      creds.providerUser,
      creds.providerPass,
      creds.providerCodigoRegional,
      creds.providerCodigoCooperativa,
    );

    // 3. PARSE - formatar mensagem (usa template customizado se houver)
    let message = formatReportMessage(tenant!.companyName, report, creds.messageTemplate);
    console.log(`[PIPELINE] Mensagem gerada para ${tenant!.companyName}`);

    // 3b. IA - insight executivo opcional via Claude (não bloqueia o envio)
    const summary = await generateExecutiveSummary(tenant!.companyName, report);
    if (summary) {
      message = `🧠 *Análise do dia*\n${summary}\n\n${message}`;
      console.log(`[PIPELINE] Insight de IA adicionado para ${tenant!.companyName}`);
    }

    // 4. DISPATCH - enviar via WhatsApp (mesmo com erros parciais)
    let sendError: string | undefined;
    try {
      await sendWhatsAppMessage({
        baseUrl: creds.quepasaBaseUrl,
        token: creds.quepasaToken,
        phone: creds.whatsappNumber,
        message,
      });
    } catch (err: any) {
      sendError = err.message;
      console.error(`[PIPELINE] Erro envio WhatsApp: ${sendError}`);
    }

    // 5. LOG - registrar resultado
    const errors = [...report.errors];
    if (sendError) errors.push(sendError);

    let status: 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';
    if (sendError && report.errors.length > 0) {
      status = 'FAILURE';
    } else if (sendError || report.errors.length > 0) {
      status = 'PARTIAL_FAILURE';
    } else {
      status = 'SUCCESS';
    }

    await logService.log(tenantId, status, message, errors.length > 0 ? errors.join(' | ') : undefined);
    console.log(`[PIPELINE] ${tenant!.companyName}: ${status}`);
  } catch (error: any) {
    console.error(`[PIPELINE] ${tenantId}: ${error.message}`);
    await logService.log(tenantId, 'FAILURE', undefined, error.message);
  }
}
