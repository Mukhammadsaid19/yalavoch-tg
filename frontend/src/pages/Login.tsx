import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuth } from '../App';
import styles from './Auth.module.css';

const API_BASE = '/users';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to your Yalavoch account</p>

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

          <form onSubmit={handleSubmit} className={styles.form}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.875rem' }}>Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Log In'}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

