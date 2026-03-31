import cron from 'node-cron';
import { dailyReportJob } from './dailyReportJob';

export function startScheduler(): void {
  cron.schedule(
    '0 19 * * *',
    async () => {
      await dailyReportJob();
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('Scheduler ativo: relatorio diario as 19:00 BRT');
}
