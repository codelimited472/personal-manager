import { TrendingUp, Target, Crown, X } from 'lucide-react';
import styles from './BillionaireTracker.module.css';

interface Props {
  onClose?: () => void;
}

export default function BillionaireTracker({ onClose }: Props) {
  const currentNetWorth = 40000000; // 4 Crores
  const target = 94360000000; // 94.36 Billion INR (1B USD * 94.36)
  const percent = (currentNetWorth / target) * 100;
  
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className={styles.trackerCard}>
      {onClose && (
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      )}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Crown className={styles.icon} /> Billionaire Tracker
        </h3>
        <span className={styles.badge}>Daily Motivation</span>
      </div>
      
      <div className={styles.progressSection}>
        <div className={styles.labels}>
          <span className={styles.label}>Current: {formatINR(currentNetWorth)}</span>
          <span className={styles.label}>Target: {formatINR(target)}</span>
        </div>
        
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '2%' }}></div>
        </div>
        
        <p className={styles.motivationText}>
          &quot;The first billion is the hardest.&quot; Keep pushing forward today!
        </p>
      </div>
    </div>
  );
}
