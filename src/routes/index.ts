import { Router } from 'express';
import authRoutes from './authRoutes';
import credentialsRoutes from './credentialsRoutes';

const router = Router();

router.use('/auth', authRoutes);             // /api/auth/login, /api/auth/register
router.use('/credentials', credentialsRoutes); // /api/credentials, /api/credentials/status

export default router;
