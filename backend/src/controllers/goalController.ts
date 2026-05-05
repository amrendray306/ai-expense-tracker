import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, targetAmount, deadline, emoji } = req.body;

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: Number(targetAmount),
        deadline: deadline ? new Date(deadline) : null,
        emoji: emoji || '🎯'
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { savedAmount, targetAmount, name, deadline, emoji } = req.body;

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name,
        targetAmount: targetAmount !== undefined ? Number(targetAmount) : undefined,
        savedAmount: savedAmount !== undefined ? Number(savedAmount) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        emoji
      }
    });

    res.json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.savingsGoal.delete({ where: { id } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};
