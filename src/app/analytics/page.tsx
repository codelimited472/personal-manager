'use client';

import { BarChart3, TrendingUp, CheckSquare, Target, Droplet, Sparkles } from 'lucide-react';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  return (
    <div className="page">
      <div className={styles.container}>
        <div className={styles.metricCard}>
          <TrendingUp className={styles.iconTrend} />
          <div>
            <h3>Completion Ratio</h3>
            <h2>84%</h2>
            <p>Tasks completed on time this week</p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <Target className={styles.iconHabit} />
            <h4>Habit Streaks</h4>
            <div className={styles.item}>
              <span>Exercise</span>
              <strong>5 days streak</strong>
            </div>
            <div className={styles.item}>
              <span>Reading</span>
              <strong>12 days streak</strong>
            </div>
          </div>

          <div className={styles.card}>
            <Droplet className={styles.iconWater} />
            <h4>Water Intake</h4>
            <div className={styles.item}>
              <span>Average Daily</span>
              <strong>1850 ml</strong>
            </div>
            <div className={styles.item}>
              <span>Goal Met</span>
              <strong>5 / 7 days</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
