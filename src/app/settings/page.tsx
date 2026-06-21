'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { LogOut, User as UserIcon, Mail, Shield } from 'lucide-react';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="page" style={{ padding: 'var(--space-4)' }}>Loading...</div>;
  }

  const email = user?.email || 'No email provided';
  const name = user?.user_metadata?.full_name || email.split('@')[0];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="page">
      <div className={styles.container}>
        
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Account Profile</h3>
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                {initial}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{name}</span>
                <span className={styles.userEmail}>{email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Account Information</h3>
          
          <div className={styles.actionButton} style={{ cursor: 'default' }}>
            <Mail size={18} color="var(--text-secondary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Email</span>
              <span>{email}</span>
            </div>
          </div>

          <div className={styles.actionButton} style={{ cursor: 'default' }}>
            <UserIcon size={18} color="var(--text-secondary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>User ID</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>{user?.id || 'Unknown ID'}</span>
            </div>
          </div>

          <div className={styles.actionButton} style={{ cursor: 'default' }}>
            <Shield size={18} color="var(--text-secondary)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Account Status</span>
              <span style={{ color: 'var(--accent-success)' }}>Active</span>
            </div>
          </div>
        </div>

        <button 
          onClick={signOut}
          className={`${styles.actionButton} ${styles.logoutButton}`}
        >
          <LogOut size={20} />
          <span>Log out of Personal Manager</span>
        </button>

      </div>
    </div>
  );
}
