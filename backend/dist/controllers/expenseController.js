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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReceipt = exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getExpenses = void 0;
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const notificationDbService_1 = require("../services/notificationDbService");
const checkBudget = (userId, categoryId) => __awaiter(void 0, void 0, void 0, function* () {
    // Check global user budget
    const user = yield db_1.prisma.user.findUnique({ where: { id: userId }, include: { expenses: true } });
    if (user && user.monthlyBudget && user.monthlyBudget > 0) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTotal = user.expenses
            .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
            .reduce((sum, e) => sum + e.amount, 0);
        if (monthlyTotal > user.monthlyBudget) {
            const msg = `You have spent ₹${monthlyTotal.toFixed(2)} this month, which exceeds your overall limit of ₹${user.monthlyBudget.toFixed(2)}.`;
            (0, notificationService_1.sendNotification)(user.email, user.phone, '⚠️ Budget Alert: You Exceeded Your Monthly Limit!', `Hello ${user.name},\n\n${msg}`);
            yield (0, notificationDbService_1.createNotification)(user.id, 'budget_alert', msg);
        }
    }
    // Check category budget
    if (categoryId) {
        const category = yield db_1.prisma.category.findUnique({
            where: { id: categoryId },
            include: { expenses: true }
        });
        if (category && category.budget && category.budget > 0) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const categoryTotal = category.expenses
                .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
                .reduce((sum, e) => sum + e.amount, 0);
            if (categoryTotal > category.budget) {
                const msg = `You have spent ₹${categoryTotal.toFixed(2)} in ${category.name} this month, exceeding your limit of ₹${category.budget.toFixed(2)}.`;
                (0, notificationService_1.sendNotification)((user === null || user === void 0 ? void 0 : user.email) || '', (user === null || user === void 0 ? void 0 : user.phone) || '', `⚠️ Budget Alert: ${category.name} Budget Exceeded!`, msg);
                if (user) {
                    yield (0, notificationDbService_1.createNotification)(user.id, 'budget_alert', msg);
                }
            }
        }
    }
});
const autoCategorize = (title, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const lowerTitle = title.toLowerCase();
    const keywordMap = {
        'Food': ['dominos', 'pizza', 'mcdonalds', 'kfc', 'restaurant', 'food', 'swiggy', 'zomato', 'grocery'],
        'Transport': ['uber', 'ola', 'taxi', 'bus', 'train', 'flight', 'petrol', 'gas'],
        'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'mall'],
        'Entertainment': ['netflix', 'movie', 'spotify', 'prime', 'game'],
        'Utilities': ['electricity', 'water', 'internet', 'wifi', 'recharge', 'bill'],
    };
    let matchedCategoryName = '';
    for (const [cat, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(k => lowerTitle.includes(k))) {
            matchedCategoryName = cat;
            break;
        }
    }
    if (matchedCategoryName) {
        let category = yield db_1.prisma.category.findFirst({
            where: { name: matchedCategoryName, userId }
        });
        if (!category) {
            category = yield db_1.prisma.category.create({
                data: { name: matchedCategoryName, userId }
            });
        }
        return category.id;
    }
    return undefined;
});
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const expenses = yield db_1.prisma.expense.findMany({
            where: { userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id },
            include: { category: true },
            orderBy: { date: 'desc' },
        });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error fetching expenses' });
    }
});
exports.getExpenses = getExpenses;
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { title, amount, date } = req.body;
    let { categoryId } = req.body;
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        if (!categoryId && title) {
            const autoCatId = yield autoCategorize(title, userId);
            if (autoCatId)
                categoryId = autoCatId;
        }
        // Default category fallback
        if (!categoryId) {
            let uncat = yield db_1.prisma.category.findFirst({ where: { name: 'Uncategorized', userId } });
            if (!uncat) {
                uncat = yield db_1.prisma.category.create({ data: { name: 'Uncategorized', userId } });
            }
            categoryId = uncat.id;
        }
        const expense = yield db_1.prisma.expense.create({
            data: {
                title: title || 'Untitled Expense',
                amount: parseFloat(amount),
                date: new Date(date),
                categoryId,
                receiptUrl,
                userId,
            },
            include: { category: true },
        });
        // Fetch user for notifications
        const dbUser = yield db_1.prisma.user.findUnique({ where: { id: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id } });
        if (dbUser) {
            (0, notificationService_1.sendNotification)(dbUser.email, dbUser.phone, 'New Expense Added', `You added a new expense of ₹${expense.amount} in category ${expense.category.name}.`);
            yield checkBudget(dbUser.id, categoryId);
        }
        res.status(201).json(expense);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error creating expense' });
    }
});
exports.createExpense = createExpense;
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const id = req.params.id;
    const { title, amount, date, categoryId } = req.body;
    try {
        const existing = yield db_1.prisma.expense.findUnique({ where: { id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id } });
        if (!existing)
            return res.status(404).json({ error: 'Expense not found' });
        let receiptUrl = existing.receiptUrl;
        if (req.file) {
            receiptUrl = `/uploads/${req.file.filename}`;
        }
        const expense = yield db_1.prisma.expense.update({
            where: { id },
            data: {
                title: title || undefined,
                amount: amount ? parseFloat(amount) : undefined,
                date: date ? new Date(date) : undefined,
                categoryId,
                receiptUrl,
            },
            include: { category: true },
        });
        const dbUser = yield db_1.prisma.user.findUnique({ where: { id: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id } });
        if (dbUser) {
            (0, notificationService_1.sendNotification)(dbUser.email, dbUser.phone, 'Expense Updated', `You updated an expense to ₹${expense.amount} in category ${expense.category.name}.`);
            yield checkBudget(dbUser.id);
        }
        res.json(expense);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error updating expense' });
    }
});
exports.updateExpense = updateExpense;
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const id = req.params.id;
    try {
        const existing = yield db_1.prisma.expense.findUnique({ where: { id, userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }, include: { category: true } });
        yield db_1.prisma.expense.delete({
            where: { id, userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id },
        });
        if (existing) {
            const dbUser = yield db_1.prisma.user.findUnique({ where: { id: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id } });
            if (dbUser) {
                (0, notificationService_1.sendNotification)(dbUser.email, dbUser.phone, 'Expense Deleted', `You deleted an expense of ₹${existing.amount} from category ${existing.category.name}.`);
            }
        }
        res.json({ message: 'Expense removed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error deleting expense' });
    }
});
exports.deleteExpense = deleteExpense;
const ocrService_1 = require("../services/ocrService");
const path_1 = __importDefault(require("path"));
const parseReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: 'No receipt image uploaded' });
    }
    try {
        const imagePath = path_1.default.join(__dirname, '../../uploads', req.file.filename);
        const items = yield (0, ocrService_1.extractItemsFromReceipt)(imagePath);
        res.json({ items });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process receipt OCR' });
    }
});
exports.parseReceipt = parseReceipt;
