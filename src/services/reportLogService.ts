import prisma from '../database/prismaClient';
import { ReportStatus } from '@prisma/client';

export class ReportLogService {
  async log(
    tenantId: string,
    status: ReportStatus,
    message?: string,
    errorDetail?: string
  ) {
    return prisma.reportLog.create({
      data: { tenantId, status, message, errorDetail },
    });
  }

  async getLastLog(tenantId: string) {
    return prisma.reportLog.findFirst({
      where: { tenantId },
      orderBy: { executedAt: 'desc' },
    });
  }

  async getHistory(tenantId: string, limit = 20) {
    return prisma.reportLog.findMany({
      where: { tenantId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }
}
