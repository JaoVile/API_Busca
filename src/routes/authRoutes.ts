import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();
const ctrl = new AuthController();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);

export default router;
