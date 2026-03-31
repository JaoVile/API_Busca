import prisma from '../database/prismaClient';
import { runReportForTenant } from './reportPipeline';

export async function dailyReportJob(): Promise<void> {
  const start = Date.now();
  console.log(`\n[CRON] ========================================`);
  console.log(`[CRON] Job iniciado: ${new Date().toISOString()}`);

  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      credentials: { isNot: null },
    },
    select: { id: true, companyName: true },
  });

  console.log(`[CRON] ${tenants.length} tenant(s) encontrado(s)`);

  for (const tenant of tenants) {
    await runReportForTenant(tenant.id);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[CRON] Finalizado em ${duration}s`);
  console.log(`[CRON] ========================================\n`);
}
