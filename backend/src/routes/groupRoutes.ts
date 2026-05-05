import express from 'express';
import { createGroup, getGroups, getGroupById, addMember, getGroupBalances, getGroupAnalytics } from '../controllers/groupController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/', protect, getGroups);
router.get('/:id', protect, getGroupById);
router.post('/:id/members', protect, addMember);
router.get('/:id/balances', protect, getGroupBalances);
router.get('/:id/analytics', protect, getGroupAnalytics);

export default router;
