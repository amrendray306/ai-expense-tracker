import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { generateMonthlyReportPdf } from '../services/pdfService';
import axios from 'axios';
import fs from 'fs';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch this month's expenses
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthName = new Date().toLocaleString('default', { month: 'long' }) + ' ' + currentYear;

    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    let insights: string[] = [];

    // Optionally get ML insights
    if (expenses.length >= 5) {
      try {
        const mlResponse = await axios.post(`${ML_URL}/api/ml/analyze`, {
          expenses: expenses.map(e => ({
            ...e,
            amount: Number(e.amount),
            date: e.date.toISOString().split('T')[0],
            category: e.category?.name || 'Uncategorized'
          }))
        });
        insights = mlResponse.data.insights || [];
      } catch (err) {
        console.error('Failed to get ML insights for report');
      }
    }

    const pdfPath = await generateMonthlyReportPdf(
      userId,
      user.name,
      monthName,
      monthlyExpenses,
      insights
    );

    // Return the URL or download the file directly
    res.json({ pdfUrl: pdfPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};
