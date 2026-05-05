import express from 'express';
import { getMonthlyReport } from '../controllers/reportController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);
router.get('/monthly', getMonthlyReport);

export default router;
