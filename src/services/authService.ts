import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../database/prismaClient';

export class AuthService {
  async register(companyName: string, email: string, password: string) {
    // 1. Verifica se o email já existe
    const exists = await prisma.tenant.findUnique({ where: { email } });
    if (exists) throw new Error('Email já cadastrado');

    // 2. Gera o hash da senha (12 rounds de salt)
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Cria o tenant no banco
    const tenant = await prisma.tenant.create({
      data: { companyName, email, passwordHash },
      select: { id: true, companyName: true, email: true, createdAt: true },
    });

    // 4. Gera o token JWT
    const token = this.generateToken(tenant.id);

    return { tenant, token };
  }

  async login(email: string, password: string) {
    // 1. Busca o tenant pelo email
    const tenant = await prisma.tenant.findUnique({ where: { email } });
    if (!tenant) throw new Error('Credenciais inválidas');

    // 2. Compara a senha digitada com o hash salvo
    const valid = await bcrypt.compare(password, tenant.passwordHash);
    if (!valid) throw new Error('Credenciais inválidas');

    // 3. Verifica se a conta está ativa
    if (!tenant.isActive) throw new Error('Conta desativada');

    // 4. Gera o token JWT
    const token = this.generateToken(tenant.id);

    return {
      token,
      tenant: {
        id: tenant.id,
        companyName: tenant.companyName,
        email: tenant.email,
      },
    };
  }

  private generateToken(tenantId: string): string {
    return jwt.sign({ tenantId }, process.env.JWT_SECRET!, {
      expiresIn: '7d', // Token válido por 7 dias
    });
  }
}
