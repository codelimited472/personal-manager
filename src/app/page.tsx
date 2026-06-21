'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare, Square, Compass, CheckCircle2, Droplet, Calendar, AlertTriangle, Wallet, Lightbulb, Car, Briefcase, Plus, RefreshCw
} from 'lucide-react';
import { getDB, type LocalTask, type LocalHabit, type LocalHabitLog, type LocalWaterLog, type LocalExpense, type LocalNotification } from '@/lib/db';
import QuickExpenseLog from '@/components/QuickExpenseLog';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [habits, setHabits] = useState<(LocalHabit & { completedToday?: boolean })[]>([]);
  const [waterAmount, setWaterAmount] = useState(0);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const waterTarget = 2000; // ml

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const db = getDB();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch uncompleted today's tasks
        const todayTasks = await db.tasks
          .filter(t => !t.due_date || t.due_date <= todayStr)
          .toArray();
        setTasks(todayTasks.filter(t => t.status !== 'completed').slice(0, 5));

        // 2. Fetch habits & today's logs
        const allHabits = await db.habits.toArray();
        const todayLogs = await db.habitLogs.where('date').equals(todayStr).toArray();
        const mappedHabits = allHabits.map(h => ({
          ...h,
          completedToday: todayLogs.some(l => l.habit_id === h.id && l.completed),
        }));
        setHabits(mappedHabits.slice(0, 5));

        // 3. Fetch water intake for today
        const todayWater = await db.waterLogs.where('date').equals(todayStr).toArray();
        const totalWater = todayWater.reduce((sum, w) => sum + w.amount, 0);
        setWaterAmount(totalWater);

        // 4. Fetch recent expenses
        const recentExpenses = await db.expenses
          .orderBy('date')
          .reverse()
          .limit(4)
          .toArray();
        setExpenses(recentExpenses);

        // 5. Fetch recent ideas
        const recentIdeas = await db.ideas
          .limit(3)
          .toArray();
        setIdeas(recentIdeas);

        // 6. Fetch upcoming alerts/notifications
        const alerts = await db.notifications
          .filter(n => !n.read)
          .toArray();
        setNotifications(alerts.slice(0, 3));

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }
    loadDashboardData();
  }, [refreshKey]);

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

  const toggleHabit = async (habitId: string, completedToday?: boolean) => {
    const db = getDB();
    const todayStr = new Date().toISOString().split('T')[0];
    const existingLog = await db.habitLogs
      .where('[habit_id+date]')
      .equals([habitId, todayStr])
      .first();

    if (existingLog) {
      await db.habitLogs.update(existingLog.id, { completed: !completedToday });
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        user_id: 'local-user',
        habit_id: habitId,
        date: todayStr,
        completed: true,
        created_at: new Date().toISOString(),
        _syncStatus: 'pending',
      });
    }
    setRefreshKey(prev => prev + 1);
  };

  const logWater = async (amount: number) => {
    const db = getDB();
    const todayStr = new Date().toISOString().split('T')[0];
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

  return (
    <div className="page">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <CheckSquare className={styles.sectionIcon} /> Today's Todo
          </h3>
          <button className={styles.addBtn} onClick={() => router.push('/tasks')}>
            <Plus size={16} /> Add Task
          </button>
        </div>
        <div className={styles.listCard}>
          {tasks.length === 0 ? (
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

      {/* Quick Stats Grid (Pushed Down) */}
      <div className={styles.statsGrid}>
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
            ₹{expenses.filter(e => e.date === new Date().toISOString().split('T')[0]).reduce((sum, e) => sum + e.amount, 0).toFixed(0)}
          </div>
          <div className={styles.statLabel}>Today's Spend</div>
        </div>
        <div className={styles.statCard}>
          <CheckSquare className={styles.statIconTasks} />
          <div className={styles.statValue}>{tasks.length}</div>
          <div className={styles.statLabel}>Pending Tasks</div>
        </div>
      </div>

      {/* Habits Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Compass className={styles.sectionIcon} /> Habit Streaks
          </h3>
          <button className={styles.addBtn} onClick={() => router.push('/habits')}>
            <Plus size={16} /> Manage
          </button>
        </div>
        <div className={styles.listCard}>
          {habits.length === 0 ? (
            <div className={styles.emptyState}>Create a habit to build consistency!</div>
          ) : (
            habits.map(habit => (
              <div key={habit.id} className={styles.listItem}>
                <button
                  onClick={() => toggleHabit(habit.id, habit.completedToday)}
                  className={styles.checkBtn}
                >
                  {habit.completedToday ? (
                    <CheckCircle2 className={styles.checkIconDone} size={20} />
                  ) : (
                    <Square className={styles.checkIcon} size={20} />
                  )}
                </button>
                <div className={styles.itemDetails}>
                  <span className={habit.completedToday ? styles.itemTextDone : styles.itemText}>
                    {habit.name}
                  </span>
                  <span className={styles.habitFreqBadge}>{habit.frequency}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Water consumption tracker */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Droplet className={styles.sectionIconWater} /> Hydration Tracker
        </h3>
        <div className={styles.waterPanel}>
          <div className={styles.waterDetails}>
            <div className={styles.waterProgressRing}>
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
            <button onClick={() => logWater(750)} className={styles.waterQuickBtn}>+750ml</button>
            <button onClick={() => logWater(1000)} className={styles.waterQuickBtn}>+1L</button>
          </div>
        </div>
      </div>
    </div>
  );
}
