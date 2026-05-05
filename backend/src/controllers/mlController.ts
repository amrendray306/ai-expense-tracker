import { Request, Response } from 'express';
import { prisma } from '../db';
import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';

export const getInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Fetch all expenses for the user
    const expenses = await prisma.expense.findMany({
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

    // Fetch user for budget context
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { monthlyBudget: true } });

    // Call Python ML service
    const mlResponse = await axios.post(`${ML_URL}/api/ml/analyze`, {
      monthlyBudget: user?.monthlyBudget || 0,
      expenses: expenses.map(e => ({
        ...e,
        amount: Number(e.amount),
        date: e.date.toISOString().split('T')[0],
        category: e.category?.name || 'Uncategorized'
      }))
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
      } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
        prevMonthTotal += Number(e.amount);
      }
    });

    if (prevMonthTotal > 0) {
      const percentageChange = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
      if (percentageChange > 0) {
        data.insights.unshift(`Your spending increased by ${percentageChange.toFixed(1)}% compared to last month.`);
      } else {
        data.insights.unshift(`Great job! Your spending decreased by ${Math.abs(percentageChange).toFixed(1)}% compared to last month.`);
      }
    }

    res.json(data);
  } catch (error) {
    console.error('ML Service Error:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
};

export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        amount: true,
        date: true
      },
      orderBy: { date: 'asc' }
    });

    const mlResponse = await axios.post(`${ML_URL}/api/ml/subscriptions`, {
      expenses: expenses.map(e => ({
        ...e,
        amount: Number(e.amount),
        date: e.date.toISOString().split('T')[0]
      }))
    });

    res.json(mlResponse.data);
  } catch (error) {
    console.error('ML Service Subscription Error:', error);
    res.status(500).json({ error: 'Failed to detect subscriptions' });
  }
};

export const getSmartAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        date: true,
        category: { select: { name: true } }
      },
      orderBy: { date: 'asc' }
    });

    const mlResponse = await axios.post(`${ML_URL}/api/ml/smart-analytics`, {
      expenses: expenses.map(e => ({
        ...e,
        amount: Number(e.amount),
        date: e.date.toISOString().split('T')[0],
        category: e.category?.name || 'Uncategorized'
      }))
    });

    res.json(mlResponse.data);
  } catch (error) {
    console.error('ML Service Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch smart analytics' });
  }
};

export const parseExpense = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for parsing' });
    }

    const mlResponse = await axios.post(`${ML_URL}/api/ml/parse-expense`, {
      text
    });

    res.json(mlResponse.data);
  } catch (error) {
    console.error('ML Service Parse Expense Error:', error);
    res.status(500).json({ error: 'Failed to parse expense' });
  }
};
