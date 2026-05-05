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
exports.getMonthlyReport = void 0;
const db_1 = require("../db");
const pdfService_1 = require("../services/pdfService");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';
const getMonthlyReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Fetch this month's expenses
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthName = new Date().toLocaleString('default', { month: 'long' }) + ' ' + currentYear;
        const expenses = yield db_1.prisma.expense.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { date: 'asc' },
        });
        const monthlyExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        let insights = [];
        // Optionally get ML insights
        if (expenses.length >= 5) {
            try {
                const mlResponse = yield axios_1.default.post(`${ML_URL}/api/ml/analyze`, {
                    monthlyBudget: user.monthlyBudget || 0,
                    expenses: expenses.map(e => {
                        var _a;
                        return (Object.assign(Object.assign({}, e), { amount: Number(e.amount), date: e.date.toISOString().split('T')[0], category: ((_a = e.category) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized' }));
                    })
                });
                insights = mlResponse.data.insights || [];
            }
            catch (err) {
                console.error('Failed to get ML insights for report');
            }
        }
        console.log(`[Report] Generating PDF for user ${userId}...`);
        const pdfPath = yield (0, pdfService_1.generateMonthlyReportPdf)(userId, user.name, monthName, monthlyExpenses, insights);
        const absolutePath = path_1.default.join(__dirname, '../../', pdfPath);
        console.log(`[Report] Streaming file: ${absolutePath}`);
        if (!fs_1.default.existsSync(absolutePath)) {
            console.error(`[Report] Error: File not found at ${absolutePath}`);
            return res.status(500).json({ error: 'Generated report file not found' });
        }
        res.download(absolutePath, `Financial_Report_${monthName.replace(' ', '_')}.pdf`, (err) => {
            if (err) {
                console.error('[Report] Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to download report' });
                }
            }
            else {
                console.log('[Report] ✅ Successfully sent to client');
            }
            // Delete the temp file after sending
            fs_1.default.unlink(absolutePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('[Report] Failed to delete temp report:', unlinkErr);
                }
                else {
                    console.log('[Report] Temp file deleted');
                }
            });
        });
    }
    catch (error) {
        console.error('[Report] Critical Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate report' });
        }
    }
});
exports.getMonthlyReport = getMonthlyReport;
