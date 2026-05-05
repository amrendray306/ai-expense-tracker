import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import expenseRoutes from './routes/expenseRoutes';
import mlRoutes from './routes/mlRoutes';
import reportRoutes from './routes/reportRoutes';
import userRoutes from './routes/userRoutes';
import groupRoutes from './routes/groupRoutes';
import sharedExpenseRoutes from './routes/sharedExpenseRoutes';
import friendRoutes from './routes/friendRoutes';
import notificationRoutes from './routes/notificationRoutes';
import goalRoutes from './routes/goalRoutes';
import { setIo } from './services/notificationDbService';
import { initCronJobs } from './cron';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5500;

// ── Socket.IO ──────────────────────────────────────
export const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

setIo(io);

io.on('connection', (socket) => {
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${userId} joined room`);
  });
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});
// ───────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/shared-expenses', sharedExpenseRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/goals', goalRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.send('Personal Finance Advisor API is running...');
});

app.use((err: any, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initCronJobs();
});

export { app };
