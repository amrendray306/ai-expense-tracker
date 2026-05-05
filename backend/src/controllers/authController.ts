import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { sendNotification } from '../services/notificationService';
import axios from 'axios';

const generateToken = (id: string, email: string) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      if (userExists.isVerified) {
        return res.status(400).json({ error: 'User already exists and is verified' });
      } else {
        // Resend OTP if user exists but isn't verified
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await prisma.user.update({
          where: { email },
          data: { otpCode, otpExpiresAt, phone }
        });

        await sendNotification(email, phone, 'Your Verification Code', `Your OTP is: ${otpCode}. It expires in 10 minutes.`);

        return res.status(200).json({ message: 'OTP resent to unverified email', email });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
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

    await sendNotification(email, phone, 'Your FinAdvisor Verification Code', `Your OTP is: ${otpCode}. It expires in 10 minutes.`);

    res.status(201).json({
      message: 'Registration successful. Please verify OTP.',
      email: user.email
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

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

    await prisma.user.update({
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
  } catch (error) {
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiresAt }
    });

    await sendNotification(email, user.phone, 'Your New Verification Code', `Your new OTP is: ${otpCode}. It expires in 10 minutes.`);

    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during OTP resend' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
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
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    // Fetch user info from Google using the access token
    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const payload = userInfoRes.data;
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email,
          googleId,
          isVerified: true 
        },
      });
    } else if (!user.googleId) {
      // Link existing account to Google
      user = await prisma.user.update({
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
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Server error during Google Auth' });
  }
};

export const updateBudget = async (req: Request, res: Response) => {
  const { budget } = req.body;
  const userId = (req as any).user?.id;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { monthlyBudget: Number(budget) }
    });

    res.json({ message: 'Budget updated successfully', monthlyBudget: user.monthlyBudget });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating budget' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiresAt }
    });

    await sendNotification(email, user.phone, 'Password Reset Code', `Your password reset code is: ${otpCode}. It expires in 10 minutes.`);

    res.json({ message: 'Password reset code sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during forgot password' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpiresAt: null
      }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during password reset' });
  }
};
