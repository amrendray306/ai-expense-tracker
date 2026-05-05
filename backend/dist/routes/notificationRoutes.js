"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get('/', authMiddleware_1.protect, notificationController_1.getNotifications);
router.patch('/:id/read', authMiddleware_1.protect, notificationController_1.markRead);
router.patch('/read-all', authMiddleware_1.protect, notificationController_1.markAllRead);
exports.default = router;
