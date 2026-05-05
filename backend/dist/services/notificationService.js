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
const mail_1 = __importDefault(require("@sendgrid/mail"));
const emailTemplates_1 = require("../templates/emailTemplates");
/**
 * PRODUCTION-READY EMAIL SERVICE
 * Priority: 1. SendGrid API (Preferred) -> 2. SMTP (Fallback)
 */
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};
const sendNotification = (email, phone, subject, message) => __awaiter(void 0, void 0, void 0, function* () {
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@aifinance.com';
    const recipient = process.env.EMAIL_OVERRIDE || email;
    const htmlContent = (0, emailTemplates_1.getEmailHtml)(subject, message);
    // ── 1. SENDGRID API (Production Preferred) ──────────────────────────────────
    if (process.env.SENDGRID_API_KEY) {
        try {
            mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
            yield mail_1.default.send({
                to: recipient,
                from: fromEmail,
                subject: subject,
                text: message,
                html: htmlContent
            });
            console.log(`[Email] ✅ Sent via SendGrid to ${email}`);
        }
        catch (error) {
            console.error(`[Email] ❌ SendGrid failed for ${email}:`, error.message);
        }
    }
    // ── 2. NODEMAILER SMTP (Development Fallback) ────────────────────────────────
    else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            const transporter = createTransporter();
            yield transporter.sendMail({
                from: fromEmail,
                to: recipient,
                subject: subject,
                text: message,
                html: htmlContent
            });
            console.log(`[Email] ✅ Sent via SMTP to ${email}`);
        }
        catch (error) {
            console.error(`[Email] ❌ SMTP failed for ${email}:`, error.message);
        }
    }
    else {
        console.warn('[Email] ⚠️ No email service configured (SendGrid/SMTP missing).');
    }
    // ── SMS (Twilio) ───────────────────────────────────────────────────────────
    if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
            const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            yield twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
            console.log(`[SMS] ✅ Sent to ${phone}`);
        }
        catch (error) {
            console.error(`[SMS] ❌ Failed to send to ${phone}:`, error);
        }
    }
});
exports.sendNotification = sendNotification;
