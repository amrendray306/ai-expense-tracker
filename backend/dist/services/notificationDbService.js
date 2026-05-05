"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.setIo = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// We import io lazily to avoid circular deps — set by index.ts after init
let _io = null;
const setIo = (io) => { _io = io; };
exports.setIo = setIo;
const createNotification = (userId, type, message, meta) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notification = yield prisma.notification.create({
            data: { userId, type, message, isRead: false, meta: meta || {} }
        });
        // Emit real-time event to user's room if socket server is ready
        if (_io) {
            _io.to(`user:${userId}`).emit('notification', notification);
        }
        return notification;
    }
    catch (error) {
        console.error('[NotificationDbService] Failed to create notification:', error);
    }
});
exports.createNotification = createNotification;
