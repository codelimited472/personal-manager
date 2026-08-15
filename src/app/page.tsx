'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare, Square, Compass, CheckCircle2, Droplet, Calendar, AlertTriangle, Wallet, Lightbulb, Car, Briefcase, Plus, RefreshCw, X
} from 'lucide-react';
import { getDB, type LocalTask, type LocalWaterLog, type LocalExpense, type LocalNotification } from '@/lib/db';
import { getToday, isSameDayLocal } from '@/lib/utils';
import QuickExpenseLog from '@/components/QuickExpenseLog';
import BillionaireTracker from '@/components/BillionaireTracker';
import EventsWidget from '@/components/EventsWidget';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [waterAmount, setWaterAmount] = useState(0);
  const [todaySpend, setTodaySpend] = useState<number>(0);
  const [ideas, setIdeas] = useState<unknown[]>([]);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [showBillionaireTracker, setShowBillionaireTracker] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const waterTarget = 2000; // ml

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const db = getDB();
        const todayStr = getToday();

        // 1. Fetch uncompleted today's tasks + tasks completed today
        const allTasks = await db.tasks.toArray();
        setPendingTasksCount(allTasks.filter(t => t.status !== 'completed').length);

        const todayTasks = allTasks.filter(t => 
          (t.status !== 'completed' && (!t.due_date || t.due_date <= todayStr)) ||
          (t.status === 'completed' && isSameDayLocal(t.completed_at, todayStr))
        );
        
        const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 } as const;
        todayTasks.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (b.status === 'completed' && a.status !== 'completed') return -1;
          
          const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
          const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
          return pB - pA;
        });
        setTasks(todayTasks);

        // 3. Fetch water intake for today
        const todayWater = await db.waterLogs.where('date').equals(todayStr).toArray();
        const totalWater = todayWater.reduce((sum, w) => sum + w.amount, 0);
        setWaterAmount(totalWater);

        // 4. Fetch today's expenses
        const todayExpenses = await db.expenses
          .where('date')
          .equals(todayStr)
          .toArray();
        setTodaySpend(todayExpenses.reduce((sum, e) => sum + e.amount, 0));

        // 5. Fetch recent ideas
        const recentIdeas = await db.ideas
          .limit(3)
          .toArray();
        setIdeas(recentIdeas);

        // 6. Fetch upcoming alerts/notifications
        const alerts = await db.notifications
          .filter(n => !n.read && n.dismissed_date !== todayStr)
          .toArray();
        setNotifications(alerts.slice(0, 3));

        // 7. Fetch settings
        const bTrackerSetting = await db.settings.get('show_billionaire_tracker');
        if (bTrackerSetting) {
          if (bTrackerSetting.value === 'false') {
            setShowBillionaireTracker(false); // Keep legacy handling if needed
          } else if (bTrackerSetting.value === todayStr) {
            setShowBillionaireTracker(false);
          } else {
            setShowBillionaireTracker(true);
          }
        }
        
        const calendarSetting = await db.settings.get('show_home_calendar');
        if (calendarSetting && calendarSetting.value === 'true') {
          setShowCalendar(true);
        } else {
          setShowCalendar(false);
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, [refreshKey]);

  // Check for day rollover (midnight) to refresh data and re-show the billionaire tracker
  useEffect(() => {
    let currentDayStr = getToday();
    
    const interval = setInterval(() => {
      const newDayStr = getToday();
      if (newDayStr !== currentDayStr) {
        currentDayStr = newDayStr;
        setRefreshKey(prev => prev + 1);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Actions
  const toggleTask = async (id: string, currentStatus: string) => {
    const db = getDB();
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await db.tasks.update(id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });
    setRefreshKey(prev => prev + 1);
  };

  const dismissNotification = async (id: string) => {
    const db = getDB();
    await db.notifications.update(id, { 
      read: true,
      _syncStatus: 'pending'
    });
    setRefreshKey(prev => prev + 1);
  };

  const logWater = async (amount: number) => {
    const db = getDB();
    const todayStr = getToday();
    await db.waterLogs.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      date: todayStr,
      amount,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });
    setRefreshKey(prev => prev + 1);
  };

  const waterPercentage = Math.min(Math.round((waterAmount / waterTarget) * 100), 100);

  const closeBillionaireTracker = async () => {
    setShowBillionaireTracker(false);
    const db = getDB();
    const todayStr = new Date().toISOString().split('T')[0];
    await db.settings.put({
      key: 'show_billionaire_tracker',
      user_id: 'local-user', // Should match how settings page saves it
      value: todayStr,
      _syncStatus: 'pending'
    });
  };

  return (
    <div className="page">
      {showBillionaireTracker && <BillionaireTracker onClose={closeBillionaireTracker} />}
      <QuickExpenseLog onExpenseAdded={() => setRefreshKey(prev => prev + 1)} />

      {/* Alerts & Reminders */}
      {notifications.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <AlertTriangle className={styles.sectionIconWarning} /> Upcoming Reminders
          </h3>
          <div className={styles.alertList}>
            {notifications.map(alert => (
              <div key={alert.id} className={styles.alertItem}>
                <div className={styles.alertContent}>
                  <strong>{alert.title}</strong>
                  {alert.body && <p>{alert.body}</p>}
                </div>
                <button className={styles.closeAlertBtn} onClick={() => dismissNotification(alert.id)}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <CheckSquare className={styles.sectionIcon} /> Today&apos;s Todo
          </h3>
          <button className={styles.addBtn} onClick={() => router.push('/tasks')}>
            <Plus size={16} /> Add Task
          </button>
        </div>
        <div className={`${styles.listCard} ${styles.scrollableListCard}`}>
          {isLoading ? (
            <>
              <Skeleton height="40px" className={styles.listItem} />
              <Skeleton height="40px" className={styles.listItem} />
              <Skeleton height="40px" className={styles.listItem} />
            </>
          ) : tasks.length === 0 ? (
            <div className={styles.emptyState}>No pending tasks today! 🎉</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className={styles.listItem}>
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className={styles.checkBtn}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className={styles.checkIconDone} size={20} />
                  ) : (
                    <Square className={styles.checkIcon} size={20} />
                  )}
                </button>
                <div className={styles.itemDetails}>
                  <span className={task.status === 'completed' ? styles.itemTextDone : styles.itemText}>
                    {task.title}
                  </span>
                  <span className={styles.itemBadge} style={{
                    borderColor: task.priority === 'urgent' ? 'var(--accent-danger)' : 'var(--border-primary)'
                  }}>
                    {task.category}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Calendar Widget */}
      {showCalendar && (
        <div className={styles.section}>
          <div className={`${styles.listCard} ${styles.scrollableListCard}`}>
            <EventsWidget refreshKey={refreshKey} readOnly={true} />
          </div>
        </div>
      )}

      {/* Quick Stats Grid (Pushed Down) */}
      <div className={styles.statsGrid}>
        {isLoading ? (
          <>
            <Skeleton height="100px" borderRadius="var(--radius-xl)" />
            <Skeleton height="100px" borderRadius="var(--radius-xl)" />
            <Skeleton height="100px" borderRadius="var(--radius-xl)" />
          </>
        ) : (
          <>
            <div className={styles.statCard}>
              <Droplet className={styles.statIconWater} />
              <div className={styles.statValue}>{waterAmount}ml</div>
              <div className={styles.statLabel}>Water Intake</div>
            </div>
            <div 
              className={styles.statCard} 
              onClick={() => router.push('/expenses')}
              style={{ cursor: 'pointer' }}
            >
              <Wallet className={styles.statIconExpense} />
              <div className={styles.statValue}>
                ₹{todaySpend.toFixed(0)}
              </div>
              <div className={styles.statLabel}>Today&apos;s Spend</div>
            </div>
            <div className={styles.statCard}>
              <CheckSquare className={styles.statIconTasks} />
              <div className={styles.statValue}>{pendingTasksCount}</div>
              <div className={styles.statLabel}>Pending Tasks</div>
            </div>
          </>
        )}
      </div>

      {/* Water consumption tracker */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Droplet className={styles.sectionIconWater} /> Hydration Tracker
        </h3>
        <div className={styles.waterPanel}>
          <div className={styles.waterDetails}>
            <div 
              className={styles.waterProgressRing}
              style={{
                background: `radial-gradient(closest-side, var(--bg-surface) 79%, transparent 80% 100%), conic-gradient(var(--accent-secondary) ${waterPercentage}%, var(--border-secondary) 0)`
              }}
            >
              <span className={styles.waterPercentText}>{waterPercentage}%</span>
            </div>
            <div>
              <div className={styles.waterLogText}>Logged: {waterAmount}ml</div>
              <div className={styles.waterTargetText}>Daily Target: {waterTarget}ml</div>
            </div>
          </div>
          <div className={styles.waterQuickGrid}>
            <button onClick={() => logWater(250)} className={styles.waterQuickBtn}>+250ml</button>
            <button onClick={() => logWater(500)} className={styles.waterQuickBtn}>+500ml</button>
            <button onClick={() => logWater(700)} className={styles.waterQuickBtn}>+700ml</button>
            <button onClick={() => logWater(1000)} className={styles.waterQuickBtn}>+1L</button>
          </div>
        </div>
      </div>
    </div>
  );
}
