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
exports.sendNotification = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const twilio_1 = __importDefault(require("twilio"));
// Initialize email transporter using env vars or ethereal fallback for local dev
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});
// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const sendNotification = (email, phone, subject, message) => __awaiter(void 0, void 0, void 0, function* () {
    // Send Email
    try {
        yield transporter.sendMail({
            from: process.env.SMTP_FROM || '"FinAdvisor AI" <alerts@finadvisor.com>',
            to: email,
            subject: subject,
            text: message
        });
        console.log(`[Email] Sent to ${email}: ${subject}`);
    }
    catch (error) {
        // Silently skip email if SMTP is not configured — app still works
        console.warn(`[Email] Could not send to ${email} — check SMTP credentials in .env`);
    }
    // Send SMS
    if (phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
            yield twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
            console.log(`[Notification Service] SMS sent to ${phone}`);
        }
        catch (error) {
            console.error(`[Notification Service] Failed to send SMS to ${phone}:`, error);
        }
    }
    else if (phone) {
        console.log(`[Notification Service] Mock SMS to ${phone}: ${message}`);
    }
});
exports.sendNotification = sendNotification;
