import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, X } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  
  // Determine step: 1 = Form, 2 = OTP Verification, 3 = Forgot Password, 4 = Reset Password
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Messages
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync mode when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setStep(1);
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        
        const res = await api.post('/auth/google', { token: tokenResponse.access_token });
        login(res.data);
        onClose();
      } catch (err: any) {
        setError('Google Auth failed');
      }
    },
    onError: () => setError('Google Login Failed')
  });

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isLogin) {
      try {
        const res = await api.post('/auth/login', { email, password });
        login(res.data);
        onClose();
      } catch (err: any) {
        if (err.response?.status === 403 && err.response?.data?.unverifiedEmail) {
          setEmail(err.response.data.unverifiedEmail);
          setStep(2);
        } else {
          setError(err.response?.data?.error || 'Login failed');
        }
      }
    } else {
      try {
        const res = await api.post('/auth/register', { name, email, phone, password });
        setSuccessMsg(res.data.message || 'OTP sent to your email and phone.');
        setStep(2);
      } catch (err: any) {
        if (err.response?.data?.error === 'User already exists and is verified') {
          setError('Email is already registered and verified. Please login.');
          setIsLogin(true);
        } else if (err.response?.status === 200) {
          setSuccessMsg('You are already registered but unverified. A new OTP has been sent.');
          setStep(2);
        } else {
          setError(err.response?.data?.error || 'Registration failed');
        }
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      login(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP verification failed');
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/auth/resend-otp', { email });
      setSuccessMsg('A new OTP has been sent to your email and phone.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    }
  };

  // handleGoogleAuth is now handled by the useGoogleLogin hook

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccessMsg('Password reset code sent to your email.');
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset code');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword: password });
      setSuccessMsg(res.data.message || 'Password has been reset successfully. Please login.');
      setTimeout(() => {
        setStep(1);
        setIsLogin(true);
        setPassword('');
        setOtp('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMsg('');
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card p-8 w-full max-w-md relative z-10 border border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <BrainCircuit className="text-primary" size={28} />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-6">
          {step === 4 ? 'Reset Password' : step === 3 ? 'Forgot Password' : step === 2 ? 'Verify Account' : (isLogin ? 'Welcome Back' : 'Create Account')}
        </h2>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm">{error}</div>}
        {successMsg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl mb-6 text-sm">{successMsg}</div>}

        {step === 1 ? (
          <>
            <button 
              onClick={() => googleLogin()}
              type="button" 
              className="w-full mb-6 flex items-center justify-center gap-3 bg-white text-black font-medium py-3 rounded-xl transition-all hover:bg-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number (Optional)</label>
                  <input 
                    type="tel"
                    placeholder="+1234567890"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setStep(3); setError(''); setSuccessMsg(''); }} className="text-sm text-primary hover:text-primary/80 transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] mt-4">
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={toggleMode} className="text-primary hover:text-primary/80 font-medium">
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </>
        ) : step === 2 ? (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <p className="text-gray-400 text-sm text-center">
              We've sent a 6-digit verification code to <strong className="text-white">{email}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
              <input 
                type="text" 
                required
                maxLength={6}
                placeholder="123456"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-widest text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              Verify & Login
            </button>
            <div className="text-center">
              <button type="button" onClick={handleResendOtp} className="text-sm text-gray-400 hover:text-white transition-colors">
                Didn't receive the code? <span className="text-primary">Resend</span>
              </button>
            </div>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-white transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        ) : step === 3 ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
            <p className="text-gray-400 text-sm text-center">
              Enter your email address and we'll send you a 6-digit code to reset your password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              Send Reset Code
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-white transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
            <p className="text-gray-400 text-sm text-center">
              We've sent a code to <strong className="text-white">{email}</strong>. Enter it below with your new password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reset Code</label>
              <input 
                type="text" 
                required
                maxLength={6}
                placeholder="123456"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-widest text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              Reset Password
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-white transition-colors">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
