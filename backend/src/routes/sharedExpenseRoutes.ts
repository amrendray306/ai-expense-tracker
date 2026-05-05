import express from 'express';
import { addSharedExpense, settleUp } from '../controllers/sharedExpenseController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, addSharedExpense);
router.post('/settle', protect, settleUp);

export default router;
