import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from './Auth.module.css';

type Step = 'phone' | 'telegram' | 'otp' | 'reset' | 'success';

const API_BASE = '/users';
const RESEND_COOLDOWN = 60; // seconds

export default function ForgotPassword() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [botLink, setBotLink] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // Resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Start cooldown when entering OTP step
  useEffect(() => {
    if (step === 'otp' || step === 'telegram') {
      setResendTimer(RESEND_COOLDOWN);
    }
  }, [step]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setBotLink(data.botLink || '');
      setOtpSent(data.otpSent || false);

      if (data.otpSent) {
        setStep('otp');
      } else {
        setStep('telegram');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0 || resending) return;
    
    setResending(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, type: 'password_reset' }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.waitSeconds) {
          setResendTimer(data.waitSeconds);
        }
        throw new Error(data.error || 'Failed to resend OTP');
      }

      setBotLink(data.botLink || '');
      setOtpSent(data.otpSent || false);
      setResendTimer(RESEND_COOLDOWN);
      setOtpCode(''); // Clear old code
      
      if (data.otpSent) {
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }, [phoneNumber, resendTimer, resending]);

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otpCode, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(cleaned);
    setError('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.gridPattern} />
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
      </div>

      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <img src="/yalavoch-logo.png" alt="Yalavoch" className={styles.logoImg} />
          <span className={styles.logoText}>Yalavoch</span>
        </Link>

        <div className={styles.card}>
          {error && (
            <div className={styles.errorBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <>
              <h1 className={styles.title}>Reset password</h1>
              <p className={styles.subtitle}>Enter your phone number to receive a reset code via Telegram</p>

              <form onSubmit={handleRequestOtp} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Phone Number</label>
                  <div className={styles.phoneInputWrapper}>
                    <PhoneInput
                      international
                      defaultCountry="UZ"
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value || '')}
                      className={styles.phoneInput}
                      placeholder="+998 90 123 45 67"
                    />
                  </div>
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading || !phoneNumber}>
                  {loading ? <span className={styles.spinner} /> : 'Send Reset Code'}
                </button>
              </form>

              <p className={styles.switchAuth}>
                Remember your password? <Link to="/login">Log In</Link>
              </p>
            </>
          )}

          {/* Telegram Step */}
          {step === 'telegram' && (
            <>
              <div className={styles.iconWrapper}>
                <div className={styles.iconPulse} />
                <div className={styles.iconCore}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                  </svg>
                </div>
              </div>
              
              <h1 className={styles.title}>Open Telegram</h1>
              <p className={styles.subtitle}>Receive your password reset code via our Telegram bot</p>

              <div className={styles.instructions}>
                <div className={styles.instructionStep}>
                  <span className={styles.stepNumber}>1</span>
                  <span>Open our Telegram bot</span>
                </div>
                <div className={styles.instructionStep}>
                  <span className={styles.stepNumber}>2</span>
                  <span>Tap Start and share your contact</span>
                </div>
                <div className={styles.instructionStep}>
                  <span className={styles.stepNumber}>3</span>
                  <span>Return here to enter the code</span>
                </div>
              </div>

              <a href={botLink} target="_blank" rel="noopener noreferrer" className={styles.telegramBtn}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                </svg>
                Open Telegram Bot
              </a>

              <div className={styles.resendSection}>
                <button className={styles.linkBtn} onClick={() => setStep('otp')}>
                  I've received my code →
                </button>
                <button 
                  className={`${styles.resendBtn} ${resendTimer > 0 ? styles.disabled : ''}`}
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || resending}
                >
                  {resending ? (
                    <span className={styles.spinnerSmall} />
                  ) : resendTimer > 0 ? (
                    `Resend code in ${formatTime(resendTimer)}`
                  ) : (
                    'Resend code'
                  )}
                </button>
              </div>
            </>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <>
              <div className={styles.iconWrapper}>
                <div className={styles.iconCore} style={{ background: 'var(--color-accent)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              
              <h1 className={styles.title}>Enter code & new password</h1>
              <p className={styles.subtitle}>
                {otpSent ? 'Code sent to your Telegram!' : 'Enter the 6-digit code and your new password'}
              </p>

              <form onSubmit={handleVerifyAndReset} className={styles.form}>
                <div className={styles.otpWrapper}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    className={styles.otpInput}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                  <div className={styles.otpDots}>
                    {[...Array(6)].map((_, i) => (
                      <span key={i} className={`${styles.dot} ${otpCode.length > i ? styles.filled : ''}`} />
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading || otpCode.length !== 6}>
                  {loading ? <span className={styles.spinner} /> : 'Reset Password'}
                </button>
              </form>

              <div className={styles.resendSection}>
                <button className={styles.linkBtn} onClick={() => setStep('telegram')}>
                  ← Back to Telegram
                </button>
                <button 
                  className={`${styles.resendBtn} ${resendTimer > 0 ? styles.disabled : ''}`}
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || resending}
                >
                  {resending ? (
                    <span className={styles.spinnerSmall} />
                  ) : resendTimer > 0 ? (
                    `Resend code in ${formatTime(resendTimer)}`
                  ) : (
                    'Resend code'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <>
              <div className={styles.iconWrapper}>
                <div className={styles.iconCore} style={{ background: 'var(--color-success)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
              </div>
              
              <h1 className={styles.title}>Password reset!</h1>
              <p className={styles.subtitle}>Your password has been successfully reset. You can now log in.</p>

              <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
