"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expenseController_1 = require("../controllers/expenseController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.post('/ocr', uploadMiddleware_1.upload.single('receipt'), expenseController_1.parseReceipt);
router.route('/').get(expenseController_1.getExpenses).post(uploadMiddleware_1.upload.single('receipt'), expenseController_1.createExpense);
router.route('/:id').put(uploadMiddleware_1.upload.single('receipt'), expenseController_1.updateExpense).delete(expenseController_1.deleteExpense);
exports.default = router;
