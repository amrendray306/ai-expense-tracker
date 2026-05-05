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
exports.generateMonthlyReportPdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generateMonthlyReportPdf = (userId, userName, month, expenses, insights) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const fileName = `report_${userId}_${Date.now()}.pdf`;
            const reportsDir = path_1.default.join(__dirname, '../../uploads/reports');
            if (!fs_1.default.existsSync(reportsDir)) {
                fs_1.default.mkdirSync(reportsDir, { recursive: true });
            }
            const filePath = path_1.default.join(reportsDir, fileName);
            const writeStream = fs_1.default.createWriteStream(filePath);
            doc.pipe(writeStream);
            // Title
            doc.fontSize(20).font('Helvetica-Bold').text(`Monthly Financial Report`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).font('Helvetica').text(`User: ${userName}`);
            doc.text(`Month: ${month}`);
            doc.moveDown(2);
            // Insights
            if (insights && insights.length > 0) {
                doc.fontSize(16).font('Helvetica-Bold').text('AI Insights & Summary');
                doc.moveDown(0.5);
                doc.fontSize(12).font('Helvetica');
                insights.forEach(insight => {
                    doc.text(`• ${insight}`);
                });
                doc.moveDown(2);
            }
            // Expenses breakdown
            doc.fontSize(16).font('Helvetica-Bold').text('Expense Breakdown');
            doc.moveDown(0.5);
            // Calculate totals
            let totalAmount = 0;
            const categoryTotals = {};
            expenses.forEach(e => {
                var _a;
                totalAmount += e.amount;
                const catName = ((_a = e.category) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized';
                categoryTotals[catName] = (categoryTotals[catName] || 0) + e.amount;
            });
            doc.fontSize(12).font('Helvetica-Bold').text(`Total Spent: Rs ${totalAmount.toFixed(2)}`);
            doc.moveDown();
            doc.font('Helvetica-Bold').text('By Category:');
            doc.font('Helvetica');
            Object.entries(categoryTotals).forEach(([cat, amount]) => {
                doc.text(`- ${cat}: Rs ${amount.toFixed(2)}`);
            });
            doc.moveDown(2);
            // Detailed List
            doc.fontSize(16).font('Helvetica-Bold').text('Detailed Transactions');
            doc.moveDown(0.5);
            expenses.forEach(e => {
                var _a;
                const dateStr = new Date(e.date).toLocaleDateString();
                const catName = ((_a = e.category) === null || _a === void 0 ? void 0 : _a.name) || 'Uncategorized';
                doc.fontSize(10).font('Helvetica').text(`${dateStr} | ${e.title} | ${catName} | Rs ${e.amount.toFixed(2)}`);
            });
            doc.end();
            writeStream.on('finish', () => {
                resolve(`uploads/reports/${fileName}`);
            });
            writeStream.on('error', (err) => {
                reject(err);
            });
        }
        catch (error) {
            reject(error);
        }
    });
});
exports.generateMonthlyReportPdf = generateMonthlyReportPdf;
