'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import styles from './login.module.css';

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

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

        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📋</span>
            <span>Tasks & Habits</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>💰</span>
            <span>Expense Tracking</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🚗</span>
            <span>Vehicle Management</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>👔</span>
            <span>Wardrobe & Outfits</span>
          </div>
        </div>

        <button
          className={styles.googleBtn}
          onClick={signInWithGoogle}
          disabled={loading}
          id="google-sign-in-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>

        <p className={styles.privacy}>
          Your data is stored securely and never shared
        </p>
      </div>
    </div>
  );
}
