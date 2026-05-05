"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getGoals = void 0;
const db_1 = require("../db");
const getGoals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const goals = yield db_1.prisma.savingsGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(goals);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});
exports.getGoals = getGoals;
const createGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { name, targetAmount, deadline, emoji } = req.body;
        const goal = yield db_1.prisma.savingsGoal.create({
            data: {
                userId,
                name,
                targetAmount: Number(targetAmount),
                deadline: deadline ? new Date(deadline) : null,
                emoji: emoji || '🎯'
            }
        });
        res.status(201).json(goal);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});
exports.createGoal = createGoal;
const updateGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const { savedAmount, targetAmount, name, deadline, emoji } = req.body;
        const goal = yield db_1.prisma.savingsGoal.update({
            where: { id },
            data: {
                name,
                targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
                savedAmount: savedAmount !== undefined ? Number(savedAmount) : undefined,
                deadline: deadline ? new Date(deadline) : undefined,
                emoji
            }
        });
        res.json(goal);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});
exports.updateGoal = updateGoal;
const deleteGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        yield db_1.prisma.savingsGoal.delete({ where: { id } });
        res.json({ message: 'Goal deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});
exports.deleteGoal = deleteGoal;
