import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const addSharedExpense = async (req: Request, res: Response) => {
  try {
    const { groupId, title, amount, paidById, splits } = req.body;
    // splits optional: if missing, divide equally. if present, must be array of { userId, amountOwed }

    if (!groupId || !title || !amount || !paidById) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    let finalSplits: { userId: string, amountOwed: number }[] = [];

    if (splits && Array.isArray(splits) && splits.length > 0) {
      finalSplits = splits;
    } else {
      // Equal split
      const memberCount = group.members.length;
      if (memberCount === 0) return res.status(400).json({ error: 'Group has no members' });
      
      const splitAmount = amount / memberCount;
      finalSplits = group.members.map(m => ({
        userId: m.userId,
        amountOwed: splitAmount
      }));
    }

    const expense = await prisma.sharedExpense.create({
      data: {
        title,
        amount,
        paidById,
        groupId,
        splits: {
          create: finalSplits
        }
      },
      include: {
        splits: true,
        paidBy: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding shared expense:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const settleUp = async (req: Request, res: Response) => {
  try {
    const { groupId, paidById, paidToId, amount } = req.body;

    if (!groupId || !paidById || !paidToId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        paidById,
        paidToId,
        amount
      }
    });

    res.status(201).json(settlement);
  } catch (error) {
    console.error('Error settling up:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSharedExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });
    const userId = (req as any).user.id;

    const expense: any = await prisma.sharedExpense.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // Authorization: Only payer or group creator can delete
    if (expense.paidById !== userId && expense.group.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    await prisma.sharedExpense.delete({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting shared expense:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
