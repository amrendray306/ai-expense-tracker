"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const groupController_1 = require("../controllers/groupController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, groupController_1.createGroup);
router.get('/', authMiddleware_1.protect, groupController_1.getGroups);
router.get('/:id', authMiddleware_1.protect, groupController_1.getGroupById);
router.post('/:id/members', authMiddleware_1.protect, groupController_1.addMember);
router.get('/:id/balances', authMiddleware_1.protect, groupController_1.getGroupBalances);
router.get('/:id/analytics', authMiddleware_1.protect, groupController_1.getGroupAnalytics);
exports.default = router;
