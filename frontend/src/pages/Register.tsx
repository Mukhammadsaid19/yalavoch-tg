import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../App';
import styles from './Auth.module.css';

type Step = 'form' | 'telegram' | 'otp' | 'company';

const API_BASE = '/users';
const RESEND_COOLDOWN = 60; // seconds

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [phoneNumber, setPhoneNumber] = useState('');
  const [projectName, setProjectName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'legal_entity'>('individual');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // OTP data
  const [otpCode, setOtpCode] = useState('');
  const [botLink, setBotLink] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // Resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);
  
  // Company data
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [directorName, setDirectorName] = useState('');
  
  // Token for authenticated requests
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

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

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          projectName,
          firstName,
          lastName,
          password,
          accountType,
          acceptTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
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
        body: JSON.stringify({ phoneNumber, type: 'registration' }),
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.requiresCompanyDetails) {
        setTempToken(data.token);
        setTempUser(data.user);
        setStep('company');
      } else {
        login(data.token, data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/complete-company-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ companyName, taxId, directorName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save company details');
      }

      login(tempToken, { ...tempUser, companyName, taxId, directorName });
      navigate('/dashboard');
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
          {/* Progress indicator */}
          <div className={styles.progress}>
            <div className={`${styles.progressStep} ${step === 'form' ? styles.active : styles.completed}`}>
              <span>1</span>
              <p>Details</p>
            </div>
            <div className={styles.progressLine} />
            <div className={`${styles.progressStep} ${step === 'telegram' || step === 'otp' ? styles.active : step === 'company' ? styles.completed : ''}`}>
              <span>2</span>
              <p>Verify</p>
            </div>
            {accountType === 'legal_entity' && (
              <>
                <div className={styles.progressLine} />
                <div className={`${styles.progressStep} ${step === 'company' ? styles.active : ''}`}>
                  <span>3</span>
                  <p>Company</p>
                </div>
              </>
            )}
          </div>

          {/* Error message */}
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

          {/* Registration Form */}
          {step === 'form' && (
            <>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.subtitle}>Start verifying users in minutes</p>

              <form onSubmit={handleSubmitForm} className={styles.form}>
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

                <div className={styles.inputGroup}>
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My App"
                    required
                  />
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Account Type</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioCard} ${accountType === 'individual' ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        name="accountType"
                        value="individual"
                        checked={accountType === 'individual'}
                        onChange={() => setAccountType('individual')}
                      />
                      <div className={styles.radioContent}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <div>
                          <strong>Individual</strong>
                          <span>Personal account</span>
                        </div>
                      </div>
                    </label>
                    <label className={`${styles.radioCard} ${accountType === 'legal_entity' ? styles.selected : ''}`}>
                      <input
                        type="radio"
                        name="accountType"
                        value="legal_entity"
                        checked={accountType === 'legal_entity'}
                        onChange={() => setAccountType('legal_entity')}
                      />
                      <div className={styles.radioContent}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85" />
                        </svg>
                        <div>
                          <strong>Business</strong>
                          <span>Company account</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I accept the <a href="#" target="_blank">Public Offer</a> and{' '}
                    <a href="#" target="_blank">Terms of Service</a>
                  </span>
                </label>

                <button type="submit" className={styles.btnPrimary} disabled={loading || !acceptTerms}>
                  {loading ? <span className={styles.spinner} /> : 'Sign Up'}
                </button>
              </form>

              <p className={styles.switchAuth}>
                Already have an account? <Link to="/login">Log In</Link>
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
              
              <h1 className={styles.title}>Verification via Yalavoch</h1>
              <p className={styles.subtitle}>Open our Telegram bot to receive your verification code</p>

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
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
              </div>
              
              <h1 className={styles.title}>Enter verification code</h1>
              <p className={styles.subtitle}>
                {otpSent ? 'Code sent to your Telegram!' : 'Enter the 6-digit code from Telegram'}
              </p>

              <form onSubmit={handleVerifyOtp} className={styles.form}>
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

                <button type="submit" className={styles.btnPrimary} disabled={loading || otpCode.length !== 6}>
                  {loading ? <span className={styles.spinner} /> : 'Verify'}
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

          {/* Company Details Step */}
          {step === 'company' && (
            <>
              <div className={styles.iconWrapper}>
                <div className={styles.iconCore} style={{ background: 'var(--color-secondary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85" />
                  </svg>
                </div>
              </div>
              
              <h1 className={styles.title}>Company Details</h1>
              <p className={styles.subtitle}>
                A contract will be sent to you via Didox. Please complete the details below.
              </p>

              <form onSubmit={handleSubmitCompany} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Tax Identification Number (INN)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="123456789"
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Director's Full Name</label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'Complete Registration'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
