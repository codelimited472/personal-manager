'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LogOut, User as UserIcon, Mail, Shield, Moon, Sun, Crown } from 'lucide-react';
import { getDB } from '@/lib/db';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showBillionaireTracker, setShowBillionaireTracker] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const db = getDB();
      const setting = await db.settings.get('show_billionaire_tracker');
      if (setting) {
        setShowBillionaireTracker(setting.value === 'true');
      }
    };
    loadSettings();
  }, []);

  const toggleBillionaireTracker = async () => {
    const newValue = !showBillionaireTracker;
    setShowBillionaireTracker(newValue);
    const db = getDB();
    await db.settings.put({
      key: 'show_billionaire_tracker',
      user_id: user?.id || 'local-user',
      value: newValue.toString(),
      _syncStatus: 'pending'
    });
  };

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

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>App Preferences</h3>
          
          <div className={styles.actionButton} onClick={toggleTheme}>
            {theme === 'dark' ? <Moon size={18} color="var(--text-secondary)" /> : <Sun size={18} color="var(--text-secondary)" />}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Appearance</span>
              <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <div style={{
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              background: theme === 'dark' ? 'var(--accent-primary)' : 'var(--border-secondary)',
              position: 'relative',
              transition: 'background 0.3s ease'
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: theme === 'dark' ? '20px' : '2px',
                transition: 'left 0.3s ease'
              }} />
            </div>
          </div>

          <div className={styles.actionButton} onClick={toggleBillionaireTracker}>
            <Crown size={18} color="var(--text-secondary)" />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Billionaire Tracker</span>
              <span>{showBillionaireTracker ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div style={{
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              background: showBillionaireTracker ? 'var(--accent-primary)' : 'var(--border-secondary)',
              position: 'relative',
              transition: 'background 0.3s ease'
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: showBillionaireTracker ? '20px' : '2px',
                transition: 'left 0.3s ease'
              }} />
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
