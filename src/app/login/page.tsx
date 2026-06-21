'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import styles from './login.module.css';

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    setErrorMsg('');
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setErrorMsg(error.message);
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    const { error } = await signUpWithEmail(email, password);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setErrorMsg('Account created successfully. You can now login or check your email for a confirmation link.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={styles.content}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="url(#logo-gradient)" />
              <path d="M14 24L21 31L34 18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#7c6cf0" />
                  <stop offset="1" stopColor="#00d4c8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>Personal Manager</h1>
          <p className={styles.subtitle}>Your complete personal operating system</p>
        </div>

        <form className={styles.formContainer} onSubmit={handleLogin}>
          {errorMsg && (
            <div style={{ background: 'var(--bg-card)', color: 'var(--accent-danger)', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', border: '1px solid var(--accent-danger)' }}>
              {errorMsg}
            </div>
          )}
          <input
            type="email"
            placeholder="Email Address"
            className={styles.inputField}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Password"
            className={styles.inputField}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginBottom: '24px', fontSize: '16px' }}
          />
          <button
            type="submit"
            className={styles.googleBtn}
            disabled={loading || isSubmitting}
            style={{ width: '100%', marginBottom: '12px' }}
          >
            <span>{isSubmitting ? 'Processing...' : 'Login'}</span>
          </button>
          
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleSignUp}
            disabled={loading || isSubmitting}
            style={{ width: '100%', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          >
            <span>Create Account</span>
          </button>
        </form>

        <p className={styles.privacy} style={{ marginTop: '24px' }}>
          Your data is stored securely and never shared
        </p>
      </div>
    </div>
  );
}
