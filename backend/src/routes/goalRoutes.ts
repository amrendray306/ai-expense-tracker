import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController';

const router = Router();

router.use(protect);

router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
