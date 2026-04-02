import { Router } from 'express';
import { CredentialsController } from '../controllers/credentialsController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const ctrl = new CredentialsController();

router.put('/', authMiddleware, ctrl.upsert);
router.get('/status', authMiddleware, ctrl.getStatus);
router.delete('/', authMiddleware, ctrl.remove);

export default router;
