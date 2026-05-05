"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const mlRoutes_1 = __importDefault(require("./routes/mlRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const groupRoutes_1 = __importDefault(require("./routes/groupRoutes"));
const sharedExpenseRoutes_1 = __importDefault(require("./routes/sharedExpenseRoutes"));
const friendRoutes_1 = __importDefault(require("./routes/friendRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const goalRoutes_1 = __importDefault(require("./routes/goalRoutes"));
const notificationDbService_1 = require("./services/notificationDbService");
const cron_1 = require("./cron");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5500;
// ── Socket.IO ──────────────────────────────────────
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});
(0, notificationDbService_1.setIo)(exports.io);
exports.io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`[Socket] User ${userId} joined room`);
    });
    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});
// ───────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/expenses', expenseRoutes_1.default);
app.use('/api/ml', mlRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/groups', groupRoutes_1.default);
app.use('/api/shared-expenses', sharedExpenseRoutes_1.default);
app.use('/api/friends', friendRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/goals', goalRoutes_1.default);
app.get('/', (_req, res) => {
    res.send('Personal Finance Advisor API is running...');
});
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    (0, cron_1.initCronJobs)();
});
