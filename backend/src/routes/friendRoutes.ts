import express from 'express';
import { sendRequest, acceptRequest, rejectRequest, cancelRequest, removeFriend, listFriends, listRequests } from '../controllers/friendController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/request', protect, sendRequest);
router.post('/accept', protect, acceptRequest);
router.post('/reject', protect, rejectRequest);
router.post('/cancel', protect, cancelRequest);
router.delete('/remove', protect, removeFriend);
router.get('/list', protect, listFriends);
router.get('/requests', protect, listRequests);

export default router;
