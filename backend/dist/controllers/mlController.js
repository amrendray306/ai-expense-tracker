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
exports.parseExpense = exports.getSmartAnalytics = exports.getSubscriptions = exports.getInsights = void 0;
const db_1 = require("../db");
const axios_1 = __importDefault(require("axios"));
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';
const getInsights = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Fetch all expenses for the user
        const expenses = yield db_1.prisma.expense.findMany({
            where: { userId },
            select: {
                id: true,
                amount: true,
                date: true,
                category: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'asc' }
        });
        if (expenses.length < 5) {
            return res.json({
                anomalies: [],
                insights: ["We need at least 5 expenses to generate AI insights. Add some more!"],
                prediction: null
            });
        }
        // Call Python ML service
        const mlResponse = yield axios_1.default.post(`${ML_URL}/api/ml/analyze`, {
            expenses: expenses.map(e => {
                var _a;
                return (Object.assign(Object.assign({}, e), { amount: Number(e.amount), date: e.date.toISOString().split('T')[0], category: ((_a = e.category) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized' }));
            })
        });
        const data = mlResponse.data;
        // Month-over-Month calculation
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        let currentMonthTotal = 0;
        let prevMonthTotal = 0;
        expenses.forEach(e => {
            const d = new Date(e.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                currentMonthTotal += Number(e.amount);
            }
            else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
                prevMonthTotal += Number(e.amount);
            }
        });
        if (prevMonthTotal > 0) {
            const percentageChange = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
            if (percentageChange > 0) {
                data.insights.unshift(`Your spending increased by ${percentageChange.toFixed(1)}% compared to last month.`);
            }
            else {
                data.insights.unshift(`Great job! Your spending decreased by ${Math.abs(percentageChange).toFixed(1)}% compared to last month.`);
            }
        }
        res.json(data);
    }
    catch (error) {
        console.error('ML Service Error:', error);
        res.status(500).json({ error: 'Failed to fetch AI insights' });
    }
});
exports.getInsights = getInsights;
const getSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const expenses = yield db_1.prisma.expense.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                amount: true,
                date: true
            },
            orderBy: { date: 'asc' }
        });
        const mlResponse = yield axios_1.default.post(`${ML_URL}/api/ml/subscriptions`, {
            expenses: expenses.map(e => (Object.assign(Object.assign({}, e), { amount: Number(e.amount), date: e.date.toISOString().split('T')[0] })))
        });
        res.json(mlResponse.data);
    }
    catch (error) {
        console.error('ML Service Subscription Error:', error);
        res.status(500).json({ error: 'Failed to detect subscriptions' });
    }
});
exports.getSubscriptions = getSubscriptions;
const getSmartAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const expenses = yield db_1.prisma.expense.findMany({
            where: { userId },
            select: {
                id: true,
                amount: true,
                date: true,
                category: { select: { name: true } }
            },
            orderBy: { date: 'asc' }
        });
        const mlResponse = yield axios_1.default.post(`${ML_URL}/api/ml/smart-analytics`, {
            expenses: expenses.map(e => {
                var _a;
                return (Object.assign(Object.assign({}, e), { amount: Number(e.amount), date: e.date.toISOString().split('T')[0], category: ((_a = e.category) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized' }));
            })
        });
        res.json(mlResponse.data);
    }
    catch (error) {
        console.error('ML Service Analytics Error:', error);
        res.status(500).json({ error: 'Failed to fetch smart analytics' });
    }
});
exports.getSmartAnalytics = getSmartAnalytics;
const parseExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required for parsing' });
        }
        const mlResponse = yield axios_1.default.post(`${ML_URL}/api/ml/parse-expense`, {
            text
        });
        res.json(mlResponse.data);
    }
    catch (error) {
        console.error('ML Service Parse Expense Error:', error);
        res.status(500).json({ error: 'Failed to parse expense' });
    }
});
exports.parseExpense = parseExpense;
