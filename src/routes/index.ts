import { Router } from 'express';
import authRoutes from './authRoutes';
import credentialsRoutes from './credentialsRoutes';
import reportRoutes from './reportRoutes';

const router = Router();

router.use('/auth', authRoutes);             // /api/auth/login, /api/auth/register
router.use('/credentials', credentialsRoutes); // /api/credentials, /api/credentials/status
router.use('/reports', reportRoutes);          // /api/reports/last-status, /api/reports/history

export default router;
