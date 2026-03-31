import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CredentialsService } from '../services/credentialsService';

const service = new CredentialsService();

export class CredentialsController {
  async upsert(req: AuthRequest, res: Response) {
    try {
      const { providerToken, providerUser, providerPass, quepasaToken, quepasaBaseUrl, whatsappNumber } =
        req.body;

      if (!providerToken || !providerUser || !providerPass || !quepasaToken || !whatsappNumber) {
        res.status(400).json({
          error: 'providerToken, providerUser, providerPass, quepasaToken e whatsappNumber são obrigatórios',
        });
        return;
      }

      await service.upsert(req.tenantId!, {
        providerToken,
        providerUser,
        providerPass,
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
