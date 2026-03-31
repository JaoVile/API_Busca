import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CredentialsService } from '../services/credentialsService';

const service = new CredentialsService();

export class CredentialsController {
  async upsert(req: AuthRequest, res: Response) {
    try {
      const { providerToken, quepasaToken, quepasaBaseUrl, whatsappNumber } =
        req.body;

      if (!providerToken || !quepasaToken || !whatsappNumber) {
        res.status(400).json({
          error: 'providerToken, quepasaToken e whatsappNumber são obrigatórios',
        });
        return;
      }

      await service.upsert(req.tenantId!, {
        providerToken,
        quepasaToken,
        quepasaBaseUrl,
        whatsappNumber,
      });

      res.json({ message: 'Credenciais salvas com sucesso' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStatus(req: AuthRequest, res: Response) {
    const status = await service.getStatus(req.tenantId!);
    res.json(status || { configured: false });
  }
}
