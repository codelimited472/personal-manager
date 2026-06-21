'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { addWater, deleteLastWaterLog } from '@/features/water/services/waterService';
import { useToast } from '@/components/ui/Toast';
import { getToday } from '@/lib/utils';
import { Droplets, Undo2, GlassWater } from 'lucide-react';
import styles from './water.module.css';

const QUICK_AMOUNTS = [
  { amount: 250, label: '250ml', icon: '🥤' },
  { amount: 500, label: '500ml', icon: '🫗' },
  { amount: 750, label: '750ml', icon: '🧊' },
  { amount: 1000, label: '1L', icon: '🍶' },
];

const DAILY_TARGET = 3000; // ml

export default function WaterPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [animating, setAnimating] = useState(false);

  const todayTotal = useLiveQuery(
    async () => {
      if (!user) return 0;
      const db = getDB();
      const today = getToday();
      const logs = await db.waterLogs
        .where('user_id')
        .equals(user.id)
        .filter(l => l.date === today)
        .toArray();
      return logs.reduce((sum, l) => sum + l.amount, 0);
    },
    [user?.id],
    0
  );

  const percentage = Math.min((todayTotal / DAILY_TARGET) * 100, 100);

  const handleAdd = async (amount: number) => {
    if (!user) return;
    setAnimating(true);
    await addWater(user.id, amount);
    showToast(`+${amount}ml added! 💧`, 'success');
    setTimeout(() => setAnimating(false), 500);
  };

  const handleUndo = async () => {
    if (!user) return;
    await deleteLastWaterLog(user.id);
    showToast('Last entry removed', 'info');
  };

  return (
    <div className="page">
      {/* Water visualization */}
      <div className={styles.visualSection}>
        <div className={styles.glassContainer}>
          <div className={styles.glass}>
            <div
              className={`${styles.water} ${animating ? styles.waterAnimating : ''}`}
              style={{ height: `${percentage}%` }}
            >
              <div className={styles.waterWave} />
            </div>
            <div className={styles.glassOverlay}>
              <Droplets size={32} color="white" style={{ opacity: 0.8 }} />
              <span className={styles.waterAmount}>{todayTotal}ml</span>
              <span className={styles.waterTarget}>/ {DAILY_TARGET}ml</span>
            </div>
          </div>
        </div>

        <div className={styles.percentText}>
          <span className={styles.percentValue}>{Math.round(percentage)}%</span>
          <span className={styles.percentLabel}>of daily goal</span>
        </div>
      </div>

      {/* Quick add buttons */}
      <div className={styles.quickButtons}>
        {QUICK_AMOUNTS.map(({ amount, label, icon }) => (
          <button
            key={amount}
            className={styles.quickBtn}
            onClick={() => handleAdd(amount)}
          >
            <span className={styles.quickIcon}>{icon}</span>
            <span className={styles.quickLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* Undo */}
      {todayTotal > 0 && (
        <button className={styles.undoBtn} onClick={handleUndo}>
          <Undo2 size={16} />
          <span>Undo last entry</span>
        </button>
      )}

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <h3 className={styles.sectionTitle}>
          <GlassWater size={16} />
          Today&apos;s Progress
        </h3>
        <div className="progress-bar" style={{ height: 10, borderRadius: 5 }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className={styles.progressLabels}>
          <span>0ml</span>
          <span>{DAILY_TARGET}ml</span>
        </div>
      </div>
    </div>
  );
}
