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
exports.deleteSharedExpense = exports.settleUp = exports.addSharedExpense = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const addSharedExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId, title, amount, paidById, splits } = req.body;
        // splits optional: if missing, divide equally. if present, must be array of { userId, amountOwed }
        if (!groupId || !title || !amount || !paidById) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const group = yield prisma.group.findUnique({
            where: { id: groupId },
            include: { members: true }
        });
        if (!group)
            return res.status(404).json({ error: 'Group not found' });
        let finalSplits = [];
        if (splits && Array.isArray(splits) && splits.length > 0) {
            finalSplits = splits;
        }
        else {
            // Equal split
            const memberCount = group.members.length;
            if (memberCount === 0)
                return res.status(400).json({ error: 'Group has no members' });
            const splitAmount = amount / memberCount;
            finalSplits = group.members.map(m => ({
                userId: m.userId,
                amountOwed: splitAmount
            }));
        }
        const expense = yield prisma.sharedExpense.create({
            data: {
                title,
                amount,
                paidById,
                groupId,
                splits: {
                    create: finalSplits
                }
            },
            include: {
                splits: true,
                paidBy: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(expense);
    }
    catch (error) {
        console.error('Error adding shared expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.addSharedExpense = addSharedExpense;
const settleUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId, paidById, paidToId, amount } = req.body;
        if (!groupId || !paidById || !paidToId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const settlement = yield prisma.settlement.create({
            data: {
                groupId,
                paidById,
                paidToId,
                amount
            }
        });
        res.status(201).json(settlement);
    }
    catch (error) {
        console.error('Error settling up:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.settleUp = settleUp;
const deleteSharedExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id || typeof id !== 'string')
            return res.status(400).json({ error: 'Invalid ID' });
        const userId = req.user.id;
        const expense = yield prisma.sharedExpense.findUnique({
            where: { id },
            include: { group: true }
        });
        if (!expense)
            return res.status(404).json({ error: 'Expense not found' });
        // Authorization: Only payer or group creator can delete
        if (expense.paidById !== userId && expense.group.creatorId !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this expense' });
        }
        yield prisma.sharedExpense.delete({
            where: { id }
        });
        res.json({ message: 'Expense deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting shared expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.deleteSharedExpense = deleteSharedExpense;
