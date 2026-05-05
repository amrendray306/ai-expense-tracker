"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sharedExpenseController_1 = require("../controllers/sharedExpenseController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, sharedExpenseController_1.addSharedExpense);
router.post('/settle', authMiddleware_1.protect, sharedExpenseController_1.settleUp);
exports.default = router;
