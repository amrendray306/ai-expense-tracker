import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user?.id },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching categories' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  const { name, budget } = req.body;
  try {
    const category = await prisma.category.create({
      data: {
        name,
        budget: budget ? parseFloat(budget) : 0,
        userId: req.user?.id as string,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating category' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, budget } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id, userId: req.user?.id },
      data: { 
        name,
        ...(budget !== undefined && { budget: parseFloat(budget) })
      },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating category' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    await prisma.category.delete({
      where: { id, userId: req.user?.id },
    });
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting category' });
  }
};
