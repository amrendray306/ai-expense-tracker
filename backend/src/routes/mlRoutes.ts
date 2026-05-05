import express from 'express';
import { getInsights, getSubscriptions, getSmartAnalytics, parseExpense } from '../controllers/mlController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/insights', protect, getInsights);
router.get('/subscriptions', protect, getSubscriptions);
router.get('/analytics', protect, getSmartAnalytics);
router.post('/parse-expense', protect, parseExpense);

export default router;
