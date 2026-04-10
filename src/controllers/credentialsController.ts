import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CredentialsService } from '../services/credentialsService';

const service = new CredentialsService();

export class CredentialsController {
  async upsert(req: AuthRequest, res: Response) {
    try {
      const { providerToken, providerUser, providerPass, providerCodigoRegional, quepasaToken, quepasaBaseUrl, whatsappNumber, messageTemplate } =
        req.body;

      // Verificar se já existe credencial salva
      const existing = await service.getStatus(req.tenantId!);

      if (!existing) {
        // Primeiro cadastro — tudo obrigatório
        if (!providerToken || !providerUser || !providerPass || !quepasaToken || !whatsappNumber) {
          res.status(400).json({
            error: 'Primeiro cadastro: todos os campos são obrigatórios',
          });
          return;
        }
      }

      await service.upsertPartial(req.tenantId!, {
        providerToken: providerToken || undefined,
        providerUser: providerUser || undefined,
        providerPass: providerPass || undefined,
        providerCodigoRegional: providerCodigoRegional !== undefined ? providerCodigoRegional : undefined,
        quepasaToken: quepasaToken || undefined,
        quepasaBaseUrl: quepasaBaseUrl || undefined,
        whatsappNumber: whatsappNumber || undefined,
        messageTemplate: messageTemplate !== undefined ? messageTemplate : undefined,
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

  async remove(req: AuthRequest, res: Response) {
    try {
      await service.remove(req.tenantId!);
      res.json({ message: 'Credenciais removidas' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
