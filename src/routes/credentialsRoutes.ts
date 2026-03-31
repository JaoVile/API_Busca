import { Router } from 'express';
import { CredentialsController } from '../controllers/credentialsController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const ctrl = new CredentialsController();

// Ambas as rotas exigem autenticação (authMiddleware)
router.put('/', authMiddleware, ctrl.upsert);
router.get('/status', authMiddleware, ctrl.getStatus);

export default router;
