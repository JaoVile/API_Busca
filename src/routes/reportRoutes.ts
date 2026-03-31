import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const ctrl = new ReportController();

router.get('/last-status', authMiddleware, ctrl.lastStatus);
router.get('/history', authMiddleware, ctrl.history);

export default router;
