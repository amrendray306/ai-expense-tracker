import express from 'express';
import { addSharedExpense, settleUp, deleteSharedExpense } from '../controllers/sharedExpenseController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, addSharedExpense);
router.post('/settle', protect, settleUp);
router.delete('/:id', protect, deleteSharedExpense);

export default router;
