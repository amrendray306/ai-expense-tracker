import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize email transporter — dotenv.config() must be called BEFORE this module is imported
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,             // false = STARTTLS (required for Gmail on port 587)
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass'
  },
  tls: {
    rejectUnauthorized: false  // allow self-signed certs in dev
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
      from: process.env.SMTP_FROM || process.env.SMTP_USER || '"FinAdvisor AI" <alerts@finadvisor.com>',
      to: email,
      subject: subject,
      text: message,
      html: `<div style="font-family:sans-serif;padding:20px;background:#f9f9f9;border-radius:8px;">
        <h2 style="color:#4f46e5;">AIFinance Advisor</h2>
        <p style="font-size:16px;">${message}</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
        <small style="color:#888;">This is an automated message. Do not reply.</small>
      </div>`
    });
    console.log(`[Email] Sent to ${email}: ${subject}`);
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${email}:`, error.message);
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
