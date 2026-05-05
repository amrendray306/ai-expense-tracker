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
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("./db");
const notificationService_1 = require("./services/notificationService");
const initCronJobs = () => {
    // Weekly Report: Runs every Sunday at 9:00 AM
    node_cron_1.default.schedule('0 9 * * 0', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('[CRON] Running weekly summary job...');
        try {
            const users = yield db_1.prisma.user.findMany({ include: { expenses: true } });
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            for (const user of users) {
                const weeklyExpenses = user.expenses.filter((e) => new Date(e.date) >= oneWeekAgo);
                const total = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);
                if (total > 0) {
                    yield (0, notificationService_1.sendNotification)(user.email, user.phone, 'Your Weekly FinAdvisor Summary', `Hello ${user.name},\n\nYou spent a total of ₹${total.toFixed(2)} this week across ${weeklyExpenses.length} transactions.\nKeep up the tracking!`);
                }
            }
        }
        catch (error) {
            console.error('[CRON] Error in weekly job:', error);
        }
    }));
    // Monthly Report: Runs on the 1st of every month at 9:00 AM
    node_cron_1.default.schedule('0 9 1 * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('[CRON] Running monthly summary job...');
        try {
            const users = yield db_1.prisma.user.findMany({ include: { expenses: true } });
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            for (const user of users) {
                const monthlyExpenses = user.expenses.filter((e) => new Date(e.date) >= oneMonthAgo);
                const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
                if (total > 0) {
                    yield (0, notificationService_1.sendNotification)(user.email, user.phone, 'Your Monthly FinAdvisor Summary', `Hello ${user.name},\n\nYour total spending for the last month was ₹${total.toFixed(2)}.\nCheck your Analytics dashboard to see your predictions for the upcoming month!`);
                }
            }
        }
        catch (error) {
            console.error('[CRON] Error in monthly job:', error);
        }
    }));
    console.log('[CRON] Scheduled jobs initialized.');
};
exports.initCronJobs = initCronJobs;
