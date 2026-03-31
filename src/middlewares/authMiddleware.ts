import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extende o Request padrão do Express pra incluir o tenantId
export interface AuthRequest extends Request {
  tenantId?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  // 1. Tem header Authorization?
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  // 2. Extrai o token (remove "Bearer " do início)
  const token = header.split(' ')[1];

  try {
    // 3. Verifica e decodifica o token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      tenantId: string;
    };

    // 4. Injeta o tenantId no request pra usar nas rotas
    req.tenantId = payload.tenantId;

    // 5. Libera pra próxima função
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return;
  }
}
