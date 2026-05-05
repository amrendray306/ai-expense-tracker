import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — import from here instead of index.ts to avoid circular deps
export const prisma = new PrismaClient();
