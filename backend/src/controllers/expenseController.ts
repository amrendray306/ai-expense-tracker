import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendNotification } from '../services/notificationService';
import { createNotification } from '../services/notificationDbService';

const checkBudget = async (userId: string, categoryId?: string) => {
  // Check global user budget
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { expenses: true } });
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
      sendNotification(user.email, user.phone, '⚠️ Budget Alert: You Exceeded Your Monthly Limit!', `Hello ${user.name},\n\n${msg}`);
      await createNotification(user.id, 'budget_alert', msg);
    }
  }

  // Check category budget
  if (categoryId) {
    const category = await prisma.category.findUnique({ 
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
        sendNotification(user?.email || '', user?.phone || '', `⚠️ Budget Alert: ${category.name} Budget Exceeded!`, msg);
        if (user) {
          await createNotification(user.id, 'budget_alert', msg);
        }
      }
    }
  }
};

const autoCategorize = async (title: string, userId: string): Promise<string | undefined> => {
  const lowerTitle = title.toLowerCase();
  
  const keywordMap: { [key: string]: string[] } = {
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
    let category = await prisma.category.findFirst({
      where: { name: matchedCategoryName, userId }
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: matchedCategoryName, userId }
      });
    }
    return category.id;
  }
  return undefined;
};

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.user?.id },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching expenses' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  const { title, amount, date } = req.body;
  let { categoryId } = req.body;
  const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const userId = req.user?.id as string;

  try {
    if (!categoryId && title) {
      const autoCatId = await autoCategorize(title, userId);
      if (autoCatId) categoryId = autoCatId;
    }

    // Default category fallback
    if (!categoryId) {
      let uncat = await prisma.category.findFirst({ where: { name: 'Uncategorized', userId } });
      if (!uncat) {
        uncat = await prisma.category.create({ data: { name: 'Uncategorized', userId } });
      }
      categoryId = uncat.id;
    }

    const expense = await prisma.expense.create({
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
    const dbUser = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (dbUser) {
      sendNotification(
        dbUser.email, 
        dbUser.phone, 
        'New Expense Added', 
        `You added a new expense of ₹${expense.amount} in category ${expense.category.name}.`
      );
      await checkBudget(dbUser.id, categoryId);
    }
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating expense' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { title, amount, date, categoryId } = req.body;
  
  try {
    const existing = await prisma.expense.findUnique({ where: { id, userId: req.user?.id } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    let receiptUrl = existing.receiptUrl;
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    }

    const expense = await prisma.expense.update({
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

    const dbUser = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (dbUser) {
      sendNotification(
        dbUser.email, 
        dbUser.phone, 
        'Expense Updated', 
        `You updated an expense to ₹${expense.amount} in category ${expense.category.name}.`
      );
      await checkBudget(dbUser.id);
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating expense' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const existing = await prisma.expense.findUnique({ where: { id, userId: req.user?.id }, include: { category: true } });
    await prisma.expense.delete({
      where: { id, userId: req.user?.id },
    });

    if (existing) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user?.id } });
      if (dbUser) {
        sendNotification(
          dbUser.email, 
          dbUser.phone, 
          'Expense Deleted', 
          `You deleted an expense of ₹${existing.amount} from category ${existing.category.name}.`
        );
      }
    }

    res.json({ message: 'Expense removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting expense' });
  }
};

import { extractItemsFromReceipt } from '../services/ocrService';
import path from 'path';

export const parseReceipt = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No receipt image uploaded' });
  }

  try {
    const imagePath = path.join(__dirname, '../../uploads', req.file.filename);
    const items = await extractItemsFromReceipt(imagePath);
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process receipt OCR' });
  }
};
