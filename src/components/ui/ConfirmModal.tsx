'use client';

import { useState, useEffect } from 'react';
import styles from './ConfirmModal.module.css';

declare global {
  interface Window {
    appConfirm: (message: string) => Promise<boolean>;
  }
}

export function ConfirmModalProvider() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  useEffect(() => {
    window.appConfirm = (msg: string) => {
      setMessage(msg);
      setIsOpen(true);
      return new Promise((resolve) => {
        setResolver(() => resolve);
      });
    };
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver(true);
    close();
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    close();
  };

  const close = () => {
    setIsOpen(false);
    setMessage('');
    setResolver(null);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Confirm Delete</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={handleCancel}>Cancel</button>
          <button className={styles.btnConfirm} onClick={handleConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
