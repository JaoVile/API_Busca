import cron from 'node-cron';
import { dailyReportJob } from './dailyReportJob';

export function startScheduler(): void {
  cron.schedule(
    '00 18 * * *',
    async () => {
      await dailyReportJob();
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('Scheduler ativo: relatorio diario as 18:00 BRT');
}
