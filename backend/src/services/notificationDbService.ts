import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// We import io lazily to avoid circular deps — set by index.ts after init
let _io: any = null;
export const setIo = (io: any) => { _io = io; };

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  meta?: object
) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, message, isRead: false, meta: meta || {} }
    });

    // Emit real-time event to user's room if socket server is ready
    if (_io) {
      _io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationDbService] Failed to create notification:', error);
  }
};
