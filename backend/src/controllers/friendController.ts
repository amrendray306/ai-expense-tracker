import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createNotification } from '../services/notificationDbService';
import { sendNotification } from '../services/notificationService';

const prisma = new PrismaClient();

// Helper: get ordered pair so userId1 < userId2 always
const orderedPair = (a: string, b: string) =>
  a < b ? { userId1: a, userId2: b } : { userId1: b, userId2: a };

export const sendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ error: 'receiverId is required' });
    if (senderId === receiverId) return res.status(400).json({ error: 'Cannot send request to yourself' });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    // Check if already friends
    const pair = orderedPair(senderId, receiverId);
    const existing = await prisma.friendship.findUnique({ where: { userId1_userId2: pair } });
    if (existing) return res.status(400).json({ error: 'Already friends' });

    // Check existing request
    const existingReq = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } }
    });
    if (existingReq) return res.status(400).json({ error: 'Friend request already sent' });

    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true, email: true } });

    const request = await prisma.friendRequest.create({
      data: { senderId, receiverId, status: 'PENDING' }
    });

    // In-app notification
    await createNotification(
      receiverId,
      'FRIEND_REQUEST',
      `${sender!.name} sent you a friend request.`,
      { requestId: request.id, senderId }
    );

    // Email notification
    await sendNotification(
      receiver.email,
      receiver.phone,
      'New Friend Request – AIFinance',
      `Hi ${receiver.name},\n\n${sender!.name} sent you a friend request on AIFinance. Log in to accept or reject it.\n\nCheers,\nAIFinance Team`
    );

    res.status(201).json(request);
  } catch (error) {
    console.error('sendRequest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const acceptRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already handled' });

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } });

    // Create friendship
    const pair = orderedPair(request.senderId, request.receiverId);
    await prisma.friendship.upsert({
      where: { userId1_userId2: pair },
      create: pair,
      update: {}
    });

    const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // Notify the original sender
    await createNotification(
      request.senderId,
      'FRIEND_ACCEPTED',
      `${accepter!.name} accepted your friend request.`,
      { friendId: userId }
    );

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('acceptRequest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const rejectRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) return res.status(404).json({ error: 'Request not found' });

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const cancelRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.body;

    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.senderId !== userId) return res.status(404).json({ error: 'Request not found' });

    await prisma.friendRequest.delete({ where: { id: requestId } });
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { friendId } = req.body;

    const pair = orderedPair(userId, friendId);
    await prisma.friendship.deleteMany({ where: pair });

    // Also clean up any accepted requests between them
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const listFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId1: userId }, { userId2: userId }] },
      include: {
        user1: { select: { id: true, name: true, email: true } },
        user2: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const friends = friendships.map(f =>
      f.userId1 === userId ? f.user2 : f.user1
    );

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const listRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [incoming, outgoing] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: { sender: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.friendRequest.findMany({
        where: { senderId: userId, status: 'PENDING' },
        include: { receiver: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({ incoming, outgoing });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
