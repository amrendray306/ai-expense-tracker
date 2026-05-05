import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;

    if (!userId || !name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        creatorId: userId,
        members: {
          create: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getGroups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        sharedExpenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: {
              include: { user: { select: { id: true, name: true } } }
            }
          },
          orderBy: { date: 'desc' }
        },
        settlements: {
          include: {
            paidBy: { select: { id: true, name: true } },
            paidTo: { select: { id: true, name: true } }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Ensure the requester is a member
    if (!group.members.some(m => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // groupId
    const { userIdToAdd } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const group = await prisma.group.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    // Ensure requester is a member
    if (!group.members.some(m => m.userId === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already a member
    if (group.members.some(m => m.userId === userIdToAdd)) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: userIdToAdd
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getGroupBalances = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Fetch all shared expenses and settlements for the group
    const expenses = await prisma.sharedExpense.findMany({
      where: { groupId: id },
      include: { splits: true }
    });

    const settlements = await prisma.settlement.findMany({
      where: { groupId: id }
    });

    // Balances mapping: userId -> net balance (+ means they are owed, - means they owe)
    const balances: Record<string, number> = {};

    // Calculate from expenses
    for (const exp of expenses) {
      balances[exp.paidById] = (balances[exp.paidById] || 0) + exp.amount;
      for (const split of exp.splits) {
        balances[split.userId] = (balances[split.userId] || 0) - split.amountOwed;
      }
    }

    // Calculate from settlements
    for (const stl of settlements) {
      balances[stl.paidById] = (balances[stl.paidById] || 0) + stl.amount;
      balances[stl.paidToId] = (balances[stl.paidToId] || 0) - stl.amount;
    }

    res.json(balances);
  } catch (error) {
    console.error('Error calculating balances:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getGroupAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const [expenses, group] = await Promise.all([
      prisma.sharedExpense.findMany({
        where: { groupId: id },
        include: { paidBy: { select: { id: true, name: true } } }
      }),
      prisma.group.findUnique({
        where: { id },
        include: { members: { include: { user: { select: { id: true, name: true } } } } }
      })
    ]);

    if (!group) return res.status(404).json({ error: 'Group not found' });

    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Per-member spend
    const memberSpend: Record<string, { name: string, amount: number }> = {};
    group.members.forEach(m => {
      memberSpend[m.userId] = { name: m.user.name, amount: 0 };
    });

    expenses.forEach(e => {
      if (memberSpend[e.paidById]) {
        memberSpend[e.paidById].amount += e.amount;
      }
    });

    // Highest spender
    const sortedSpenders = Object.values(memberSpend).sort((a, b) => b.amount - a.amount);
    const topSpender = sortedSpenders[0] || null;

    res.json({
      totalSpend,
      memberSpend: sortedSpenders,
      topSpender,
      memberCount: group.members.length,
      expenseCount: expenses.length
    });
  } catch (error) {
    console.error('Error group analytics:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
