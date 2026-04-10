import prisma from '../database/prismaClient';
import { encrypt, decrypt } from '../utils/encryption';

export interface CredentialsInput {
  providerToken: string;
  providerUser: string;
  providerPass: string;
  providerCodigoRegional?: string | null;
  providerCodigoCooperativa?: string | null;
  quepasaToken: string;
  quepasaBaseUrl?: string;
  whatsappNumber: string;
  messageTemplate?: string;
}

export interface CredentialsDecrypted {
  providerToken: string;
  providerUser: string;
  providerPass: string;
  providerCodigoRegional: string | null;
  providerCodigoCooperativa: string | null;
  quepasaToken: string;
  quepasaBaseUrl: string;
  whatsappNumber: string;
  messageTemplate: string | null;
}

export class CredentialsService {
  /** Salva todas as credenciais (primeiro cadastro) */
  async upsert(tenantId: string, data: CredentialsInput) {
    const encrypted = {
      providerTokenEncrypted: encrypt(data.providerToken),
      providerUserEncrypted: encrypt(data.providerUser),
      providerPassEncrypted: encrypt(data.providerPass),
      quepasaTokenEncrypted: encrypt(data.quepasaToken),
      quepasaBaseUrl: data.quepasaBaseUrl || 'http://localhost:31000',
      whatsappNumber: data.whatsappNumber,
    };

    return prisma.tenantCredentials.upsert({
      where: { tenantId },
      update: encrypted,
      create: { tenantId, ...encrypted },
    });
  }

  /** Atualiza apenas os campos enviados (edição parcial) */
  async upsertPartial(tenantId: string, data: Partial<CredentialsInput>) {
    const existing = await prisma.tenantCredentials.findUnique({ where: { tenantId } });

    const update: Record<string, string> = {};

    if (data.providerToken) update.providerTokenEncrypted = encrypt(data.providerToken);
    if (data.providerUser) update.providerUserEncrypted = encrypt(data.providerUser);
    if (data.providerPass) update.providerPassEncrypted = encrypt(data.providerPass);
    if (data.quepasaToken) update.quepasaTokenEncrypted = encrypt(data.quepasaToken);
    if (data.quepasaBaseUrl) update.quepasaBaseUrl = data.quepasaBaseUrl;
    if (data.whatsappNumber) update.whatsappNumber = data.whatsappNumber;
    if (data.messageTemplate !== undefined) update.messageTemplate = data.messageTemplate;
    if (data.providerCodigoRegional !== undefined) {
      (update as any).providerCodigoRegional = data.providerCodigoRegional || null;
    }
    if (data.providerCodigoCooperativa !== undefined) {
      (update as any).providerCodigoCooperativa = data.providerCodigoCooperativa || null;
    }

    if (!existing) {
      // Primeiro cadastro — precisa ter tudo
      return prisma.tenantCredentials.create({
        data: {
          tenantId,
          providerTokenEncrypted: update.providerTokenEncrypted || encrypt(''),
          providerUserEncrypted: update.providerUserEncrypted || encrypt(''),
          providerPassEncrypted: update.providerPassEncrypted || encrypt(''),
          quepasaTokenEncrypted: update.quepasaTokenEncrypted || encrypt(''),
          quepasaBaseUrl: update.quepasaBaseUrl || 'http://localhost:31000',
          whatsappNumber: update.whatsappNumber || '',
        },
      });
    }

    // Update parcial — só muda o que foi enviado
    return prisma.tenantCredentials.update({
      where: { tenantId },
      data: update,
    });
  }

  async getDecrypted(tenantId: string): Promise<CredentialsDecrypted | null> {
    const creds = await prisma.tenantCredentials.findUnique({
      where: { tenantId },
    });
    if (!creds) return null;

    return {
      providerToken: decrypt(creds.providerTokenEncrypted),
      providerUser: decrypt(creds.providerUserEncrypted),
      providerPass: decrypt(creds.providerPassEncrypted),
      providerCodigoRegional: creds.providerCodigoRegional,
      providerCodigoCooperativa: creds.providerCodigoCooperativa,
      quepasaToken: decrypt(creds.quepasaTokenEncrypted),
      quepasaBaseUrl: creds.quepasaBaseUrl,
      whatsappNumber: creds.whatsappNumber,
      messageTemplate: creds.messageTemplate,
    };
  }

  async getStatus(tenantId: string) {
    const creds = await prisma.tenantCredentials.findUnique({
      where: { tenantId },
    });
    if (!creds) return null;

    let providerUser = '';
    try { providerUser = decrypt(creds.providerUserEncrypted); } catch {}

    return {
      whatsappNumber: creds.whatsappNumber,
      quepasaBaseUrl: creds.quepasaBaseUrl,
      providerUser,
      providerCodigoRegional: creds.providerCodigoRegional,
      providerCodigoCooperativa: creds.providerCodigoCooperativa,
      hasProviderToken: !!creds.providerTokenEncrypted,
      hasProviderPass: !!creds.providerPassEncrypted,
      hasQuepasaToken: !!creds.quepasaTokenEncrypted,
      messageTemplate: creds.messageTemplate,
      updatedAt: creds.updatedAt,
    };
  }

  async remove(tenantId: string) {
    return prisma.tenantCredentials.deleteMany({
      where: { tenantId },
    });
  }
}
