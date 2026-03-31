import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { companyName, email, password } = req.body;

      // Validação básica dos campos
      if (!companyName || !email || !password) {
        res
          .status(400)
          .json({ error: 'companyName, email e password são obrigatórios' });
        return;
      }

      if (password.length < 6) {
        res
          .status(400)
          .json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        return;
      }

      const result = await authService.register(companyName, email, password);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validação básica
      if (!email || !password) {
        res
          .status(400)
          .json({ error: 'email e password são obrigatórios' });
        return;
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}
