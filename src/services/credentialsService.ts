import prisma from '../database/prismaClient';
import { encrypt, decrypt } from '../utils/encryption';

export interface CredentialsInput {
  providerToken: string;
  quepasaToken: string;
  quepasaBaseUrl?: string;
  whatsappNumber: string;
}

export interface CredentialsDecrypted {
  providerToken: string;
  quepasaToken: string;
  quepasaBaseUrl: string;
  whatsappNumber: string;
}

export class CredentialsService {
  async upsert(tenantId: string, data: CredentialsInput) {
    // Criptografa os tokens antes de salvar
    const encrypted = {
      providerTokenEncrypted: encrypt(data.providerToken),
      quepasaTokenEncrypted: encrypt(data.quepasaToken),
      quepasaBaseUrl: data.quepasaBaseUrl || 'http://localhost:31000',
      whatsappNumber: data.whatsappNumber,
    };

    return prisma.tenantCredentials.upsert({
      where: { tenantId },
      update: encrypted, // Se já existe, atualiza
      create: {          // Se não existe, cria
        tenantId,
        ...encrypted,
      },
    });
  }

  async getDecrypted(tenantId: string): Promise<CredentialsDecrypted | null> {
    const creds = await prisma.tenantCredentials.findUnique({
      where: { tenantId },
    });
    if (!creds) return null;

    // Descriptografa os tokens pra usar na API
    return {
      providerToken: decrypt(creds.providerTokenEncrypted),
      quepasaToken: decrypt(creds.quepasaTokenEncrypted),
      quepasaBaseUrl: creds.quepasaBaseUrl,
      whatsappNumber: creds.whatsappNumber,
    };
  }

  async getStatus(tenantId: string) {
    // Retorna só dados públicos (sem tokens)
    return prisma.tenantCredentials.findUnique({
      where: { tenantId },
      select: {
        whatsappNumber: true,
        quepasaBaseUrl: true,
        updatedAt: true,
      },
    });
  }
}
