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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.updateBudget = exports.googleAuth = exports.login = exports.resendOtp = exports.verifyOtp = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const axios_1 = __importDefault(require("axios"));
const generateToken = (id, email) => {
    return jsonwebtoken_1.default.sign({ id, email }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, phone } = req.body;
    try {
        const userExists = yield db_1.prisma.user.findUnique({ where: { email } });
        if (userExists) {
            if (userExists.isVerified) {
                return res.status(400).json({ error: 'User already exists and is verified' });
            }
            else {
                // Resend OTP if user exists but isn't verified
                const otpCode = generateOTP();
                const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
                yield db_1.prisma.user.update({
                    where: { email },
                    data: { otpCode, otpExpiresAt, phone }
                });
                yield (0, notificationService_1.sendNotification)(email, phone, 'Your Verification Code', `Your OTP is: ${otpCode}. It expires in 10 minutes.`);
                return res.status(200).json({ message: 'OTP resent to unverified email', email });
            }
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const user = yield db_1.prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                otpCode,
                otpExpiresAt,
                isVerified: false
            },
        });
        yield (0, notificationService_1.sendNotification)(email, phone, 'Your FinAdvisor Verification Code', `Your OTP is: ${otpCode}. It expires in 10 minutes.`);
        res.status(201).json({
            message: 'Registration successful. Please verify OTP.',
            email: user.email
        });
    }
    catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});
exports.register = register;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    try {
        const user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: 'User is already verified' });
        }
        if (user.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: 'OTP has expired' });
        }
        yield db_1.prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                otpCode: null,
                otpExpiresAt: null
            }
        });
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            monthlyBudget: user.monthlyBudget,
            token: generateToken(user.id, user.email),
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during OTP verification' });
    }
});
exports.verifyOtp = verifyOtp;
const resendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: 'User is already verified' });
        }
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        yield db_1.prisma.user.update({
            where: { email },
            data: { otpCode, otpExpiresAt }
        });
        yield (0, notificationService_1.sendNotification)(email, user.phone, 'Your New Verification Code', `Your new OTP is: ${otpCode}. It expires in 10 minutes.`);
        res.json({ message: 'OTP resent successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during OTP resend' });
    }
});
exports.resendOtp = resendOtp;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            if (!user.isVerified) {
                return res.status(403).json({ error: 'Please verify your account first', unverifiedEmail: email });
            }
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                monthlyBudget: user.monthlyBudget,
                token: generateToken(user.id, user.email),
            });
        }
        else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
});
exports.login = login;
const googleAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.body;
    try {
        if (!token) {
            return res.status(400).json({ error: 'Google credential token is required' });
        }
        // Fetch user info from Google using the access token
        const userInfoRes = yield axios_1.default.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const payload = userInfoRes.data;
        if (!payload || !payload.email) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }
        const { email, name, sub: googleId } = payload;
        let user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = yield db_1.prisma.user.create({
                data: {
                    name: name || 'Google User',
                    email,
                    googleId,
                    isVerified: true
                },
            });
        }
        else if (!user.googleId) {
            // Link existing account to Google
            user = yield db_1.prisma.user.update({
                where: { email },
                data: { googleId, isVerified: true }
            });
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            monthlyBudget: user.monthlyBudget,
            token: generateToken(user.id, user.email),
        });
    }
    catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Server error during Google Auth' });
    }
});
exports.googleAuth = googleAuth;
const updateBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { budget } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const user = yield db_1.prisma.user.update({
            where: { id: userId },
            data: { monthlyBudget: Number(budget) }
        });
        res.json({ message: 'Budget updated successfully', monthlyBudget: user.monthlyBudget });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error updating budget' });
    }
});
exports.updateBudget = updateBudget;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        yield db_1.prisma.user.update({
            where: { email },
            data: { otpCode, otpExpiresAt }
        });
        yield (0, notificationService_1.sendNotification)(email, user.phone, 'Password Reset Code', `Your password reset code is: ${otpCode}. It expires in 10 minutes.`);
        res.json({ message: 'Password reset code sent to your email.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during forgot password' });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp, newPassword } = req.body;
    try {
        const user = yield db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
        yield db_1.prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                otpCode: null,
                otpExpiresAt: null
            }
        });
        res.json({ message: 'Password has been reset successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during password reset' });
    }
});
exports.resetPassword = resetPassword;
