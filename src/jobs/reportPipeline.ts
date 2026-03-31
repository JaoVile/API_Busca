import { CredentialsService } from '../services/credentialsService';
import { fetchProviderReport } from '../services/provider/providerOrchestrator';
import { formatReportMessage } from '../services/messageFormatter';
import { sendWhatsAppMessage } from '../services/quepasa/sendMessage';
import { ReportLogService } from '../services/reportLogService';
import prisma from '../database/prismaClient';

const credentialsService = new CredentialsService();
const logService = new ReportLogService();

export async function runReportForTenant(tenantId: string): Promise<void> {
  console.log(`[PIPELINE] Tenant: ${tenantId}`);

  try {
    const creds = await credentialsService.getDecrypted(tenantId);
    if (!creds) {
      await logService.log(tenantId, 'FAILURE', undefined, 'Sem credenciais');
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { companyName: true },
    });

    const report = await fetchProviderReport(creds.providerToken, creds.providerUser, creds.providerPass);
    const message = formatReportMessage(tenant!.companyName, report);

    await sendWhatsAppMessage({
      baseUrl: creds.quepasaBaseUrl,
      token: creds.quepasaToken,
      phone: creds.whatsappNumber,
      message,
    });

    const status = report.errors.length > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS';
    await logService.log(tenantId, status, message, report.errors.length > 0 ? report.errors.join(' | ') : undefined);
    console.log(`[PIPELINE] ${tenant!.companyName}: ${status}`);
  } catch (error: any) {
    console.error(`[PIPELINE] ${tenantId}: ${error.message}`);
    await logService.log(tenantId, 'FAILURE', undefined, error.message);
  }
}
