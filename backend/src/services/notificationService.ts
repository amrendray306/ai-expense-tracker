import nodemailer from 'nodemailer';
import twilio from 'twilio';

/**
 * Creates a fresh nodemailer transporter using the current process.env values.
 * 
 * IMPORTANT: The transporter MUST be created lazily (inside the function, not at
 * module load time). TypeScript compiles `import` statements to `require()` calls
 * which are ALL hoisted to the top of the compiled JS file — this means any
 * `process.env.*` reads at module scope execute BEFORE dotenv.config() runs,
 * resulting in `undefined` values and the fallback ethereal (fake) SMTP being used.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,              // STARTTLS — required for Gmail on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // allow self-signed certs in dev/staging
    }
  });
};

let testAccount: nodemailer.TestAccount | null = null;

export const sendNotification = async (
  email: string,
  phone: string | null,
  subject: string,
  message: string
) => {
  // ── Email ──────────────────────────────────────────────────────────────────
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Email] No SMTP credentials found. Using free Ethereal Email for testing...');
    try {
      if (!testAccount) {
        testAccount = await nodemailer.createTestAccount();
      }
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      const info = await transporter.sendMail({
        from: '"AI Finance Mock" <test@ethereal.email>',
        to: email,
        subject: subject,
        text: message
      });
      
      console.log(`[Email] ✅ Test email "sent" to ${email}`);
      console.log(`[Email] 🔍 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (error) {
      console.error('[Email] ❌ Failed to send Ethereal test email:', error);
    }
  } else {
    try {
      const transporter = createTransporter(); // lazy: env vars are loaded by now
      // EMAIL_OVERRIDE: redirect all emails to a fixed address (useful for dev/testing)
      const recipient = process.env.EMAIL_OVERRIDE || email;
      if (process.env.EMAIL_OVERRIDE) {
        console.log(`[Email] Override active → redirecting from ${email} to ${recipient}`);
      }
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: recipient,
        subject: subject,
        text: message
      });
      console.log(`[Email] ✅ Sent to ${email}: "${subject}"`);
    } catch (error: any) {
      console.error(`[Email] ❌ Failed to send to ${email}:`, error.message);
    }
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
  } else if (phone) {
    console.log(`[SMS] Mock (Twilio not configured) → ${phone}: ${message}`);
  }
};
