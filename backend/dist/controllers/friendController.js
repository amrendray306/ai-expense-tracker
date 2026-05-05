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
exports.listRequests = exports.listFriends = exports.removeFriend = exports.cancelRequest = exports.rejectRequest = exports.acceptRequest = exports.sendRequest = void 0;
const client_1 = require("@prisma/client");
const notificationDbService_1 = require("../services/notificationDbService");
const notificationService_1 = require("../services/notificationService");
const prisma = new client_1.PrismaClient();
// Helper: get ordered pair so userId1 < userId2 always
const orderedPair = (a, b) => a < b ? { userId1: a, userId2: b } : { userId1: b, userId2: a };
const sendRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.body;
        if (!receiverId)
            return res.status(400).json({ error: 'receiverId is required' });
        if (senderId === receiverId)
            return res.status(400).json({ error: 'Cannot send request to yourself' });
        const receiver = yield prisma.user.findUnique({ where: { id: receiverId } });
        if (!receiver)
            return res.status(404).json({ error: 'User not found' });
        // Check if already friends
        const pair = orderedPair(senderId, receiverId);
        const existing = yield prisma.friendship.findUnique({ where: { userId1_userId2: pair } });
        if (existing)
            return res.status(400).json({ error: 'Already friends' });
        // Check existing request
        const existingReq = yield prisma.friendRequest.findUnique({
            where: { senderId_receiverId: { senderId, receiverId } }
        });
        if (existingReq)
            return res.status(400).json({ error: 'Friend request already sent' });
        const sender = yield prisma.user.findUnique({ where: { id: senderId }, select: { name: true, email: true } });
        const request = yield prisma.friendRequest.create({
            data: { senderId, receiverId, status: 'PENDING' }
        });
        // In-app notification
        yield (0, notificationDbService_1.createNotification)(receiverId, 'FRIEND_REQUEST', `${sender.name} sent you a friend request.`, { requestId: request.id, senderId });
        // Email notification
        yield (0, notificationService_1.sendNotification)(receiver.email, receiver.phone, 'New Friend Request – AIFinance', `Hi ${receiver.name},\n\n${sender.name} sent you a friend request on AIFinance. Log in to accept or reject it.\n\nCheers,\nAIFinance Team`);
        res.status(201).json(request);
    }
    catch (error) {
        console.error('sendRequest error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.sendRequest = sendRequest;
const acceptRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;
        const request = yield prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.receiverId !== userId)
            return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING')
            return res.status(400).json({ error: 'Request already handled' });
        yield prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } });
        // Create friendship
        const pair = orderedPair(request.senderId, request.receiverId);
        yield prisma.friendship.upsert({
            where: { userId1_userId2: pair },
            create: pair,
            update: {}
        });
        const accepter = yield prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        // Notify the original sender
        yield (0, notificationDbService_1.createNotification)(request.senderId, 'FRIEND_ACCEPTED', `${accepter.name} accepted your friend request.`, { friendId: userId });
        res.json({ message: 'Friend request accepted' });
    }
    catch (error) {
        console.error('acceptRequest error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.acceptRequest = acceptRequest;
const rejectRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;
        const request = yield prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.receiverId !== userId)
            return res.status(404).json({ error: 'Request not found' });
        yield prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
        res.json({ message: 'Friend request rejected' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.rejectRequest = rejectRequest;
const cancelRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;
        const request = yield prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request || request.senderId !== userId)
            return res.status(404).json({ error: 'Request not found' });
        yield prisma.friendRequest.delete({ where: { id: requestId } });
        res.json({ message: 'Friend request cancelled' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.cancelRequest = cancelRequest;
const removeFriend = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { friendId } = req.body;
        const pair = orderedPair(userId, friendId);
        yield prisma.friendship.deleteMany({ where: pair });
        // Also clean up any accepted requests between them
        yield prisma.friendRequest.deleteMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId }
                ]
            }
        });
        res.json({ message: 'Friend removed' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.removeFriend = removeFriend;
const listFriends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const friendships = yield prisma.friendship.findMany({
            where: { OR: [{ userId1: userId }, { userId2: userId }] },
            include: {
                user1: { select: { id: true, name: true, email: true } },
                user2: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const friends = friendships.map(f => f.userId1 === userId ? f.user2 : f.user1);
        res.json(friends);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.listFriends = listFriends;
const listRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const [incoming, outgoing] = yield Promise.all([
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.listRequests = listRequests;
