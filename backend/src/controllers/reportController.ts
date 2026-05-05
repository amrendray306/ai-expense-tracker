import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { generateMonthlyReportPdf } from '../services/pdfService';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
          monthlyBudget: user.monthlyBudget || 0,
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

    console.log(`[Report] Generating PDF for user ${userId}...`);
    const pdfPath = await generateMonthlyReportPdf(
      userId,
      user.name,
      monthName,
      monthlyExpenses,
      insights
    );

    const absolutePath = path.join(__dirname, '../../', pdfPath);
    console.log(`[Report] Streaming file: ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      console.error(`[Report] Error: File not found at ${absolutePath}`);
      return res.status(500).json({ error: 'Generated report file not found' });
    }

    res.download(absolutePath, `Financial_Report_${monthName.replace(' ', '_')}.pdf`, (err) => {
      if (err) {
        console.error('[Report] Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download report' });
        }
      } else {
        console.log('[Report] ✅ Successfully sent to client');
      }

      // Delete the temp file after sending
      fs.unlink(absolutePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('[Report] Failed to delete temp report:', unlinkErr);
        } else {
          console.log('[Report] Temp file deleted');
        }
      });
    });
  } catch (error) {
    console.error('[Report] Critical Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
};
