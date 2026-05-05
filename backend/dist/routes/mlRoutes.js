"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mlController_1 = require("../controllers/mlController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.get('/insights', authMiddleware_1.protect, mlController_1.getInsights);
router.get('/subscriptions', authMiddleware_1.protect, mlController_1.getSubscriptions);
router.get('/analytics', authMiddleware_1.protect, mlController_1.getSmartAnalytics);
router.post('/parse-expense', authMiddleware_1.protect, mlController_1.parseExpense);
exports.default = router;
