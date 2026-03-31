import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ReportLogService } from '../services/reportLogService';
import { runReportForTenant } from '../jobs/reportPipeline';

const logService = new ReportLogService();

export class ReportController {
  async lastStatus(req: AuthRequest, res: Response) {
    const log = await logService.getLastLog(req.tenantId!);
    res.json(log || { message: 'Nenhum relatório gerado ainda' });
  }

  async history(req: AuthRequest, res: Response) {
    const logs = await logService.getHistory(req.tenantId!);
    res.json(logs);
  }

  async triggerManual(req: AuthRequest, res: Response) {
    res.json({ message: 'Relatório disparado, verifique os logs' });
    setImmediate(() => runReportForTenant(req.tenantId!));
  }
}
