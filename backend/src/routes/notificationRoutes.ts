import express from 'express';
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markRead);
router.patch('/read-all', protect, markAllRead);

export default router;
