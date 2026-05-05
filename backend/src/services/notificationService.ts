import nodemailer from 'nodemailer';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { getEmailHtml } from '../templates/emailTemplates';

/**
 * PRODUCTION-READY EMAIL SERVICE
 * Priority: 1. SendGrid API (Preferred) -> 2. SMTP (Fallback)
 */

const createTransporter = () => {
  return nodemailer.createTransport({
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

export const sendNotification = async (
  email: string,
  phone: string | null,
  subject: string,
  message: string
) => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@aifinance.com';
  const recipient = process.env.EMAIL_OVERRIDE || email;
  const htmlContent = getEmailHtml(subject, message);

  // ── 1. SENDGRID API (Production Preferred) ──────────────────────────────────
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: recipient,
        from: fromEmail,
        subject: subject,
        text: message,
        html: htmlContent
      });
      console.log(`[Email] ✅ Sent via SendGrid to ${email}`);
    } catch (error: any) {
      console.error(`[Email] ❌ SendGrid failed for ${email}:`, error.message);
    }
  } 
  // ── 2. NODEMAILER SMTP (Development Fallback) ────────────────────────────────
  else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: fromEmail,
        to: recipient,
        subject: subject,
        text: message,
        html: htmlContent
      });
      console.log(`[Email] ✅ Sent via SMTP to ${email}`);
    } catch (error: any) {
      console.error(`[Email] ❌ SMTP failed for ${email}:`, error.message);
    }
  } else {
    console.warn('[Email] ⚠️ No email service configured (SendGrid/SMTP missing).');
  }

  // ── SMS (Twilio) ───────────────────────────────────────────────────────────
  if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`[SMS] ✅ Sent to ${phone}`);
    } catch (error) {
      console.error(`[SMS] ❌ Failed to send to ${phone}:`, error);
    }
  }
};
