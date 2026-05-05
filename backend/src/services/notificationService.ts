import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize email transporter using env vars or ethereal fallback for local dev
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass'
  }
});

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const sendNotification = async (
  email: string, 
  phone: string | null, 
  subject: string, 
  message: string
) => {
  // Send Email
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"FinAdvisor AI" <alerts@finadvisor.com>',
      to: email,
      subject: subject,
      text: message
    });
    console.log(`[Email] Sent to ${email}: ${subject}`);
  } catch (error: any) {
    // Silently skip email if SMTP is not configured — app still works
    console.warn(`[Email] Could not send to ${email} — check SMTP credentials in .env`);
  }

  // Send SMS
  if (phone && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`[Notification Service] SMS sent to ${phone}`);
    } catch (error) {
      console.error(`[Notification Service] Failed to send SMS to ${phone}:`, error);
    }
  } else if (phone) {
    console.log(`[Notification Service] Mock SMS to ${phone}: ${message}`);
  }
};
