"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const friendController_1 = require("../controllers/friendController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/request', authMiddleware_1.protect, friendController_1.sendRequest);
router.post('/accept', authMiddleware_1.protect, friendController_1.acceptRequest);
router.post('/reject', authMiddleware_1.protect, friendController_1.rejectRequest);
router.post('/cancel', authMiddleware_1.protect, friendController_1.cancelRequest);
router.delete('/remove', authMiddleware_1.protect, friendController_1.removeFriend);
router.get('/list', authMiddleware_1.protect, friendController_1.listFriends);
router.get('/requests', authMiddleware_1.protect, friendController_1.listRequests);
exports.default = router;
