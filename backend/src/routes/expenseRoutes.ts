import express from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense, parseReceipt } from '../controllers/expenseController';
import { protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';

const router = express.Router();

router.use(protect);
router.post('/ocr', upload.single('receipt'), parseReceipt);
router.route('/').get(getExpenses).post(upload.single('receipt'), createExpense);
router.route('/:id').put(upload.single('receipt'), updateExpense).delete(deleteExpense);

export default router;
