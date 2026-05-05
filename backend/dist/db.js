"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Singleton Prisma client — import from here instead of index.ts to avoid circular deps
exports.prisma = new client_1.PrismaClient();
