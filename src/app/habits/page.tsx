'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toggleHabitLog, createHabit, deleteHabit } from '@/features/habits/services/habitService';
import { useToast } from '@/components/ui/Toast';
import { getToday } from '@/lib/utils';
import { Plus, Flame, X, Check, Trash2, Target } from 'lucide-react';
import type { HabitFormData, HabitFrequency } from '@/features/habits/types';
import styles from './habits.module.css';

const HABIT_COLORS = [
  '#7c6cf0', '#00d4c8', '#ff6b8a', '#ffc857', '#64b5f6', '#00c9a7', '#ff9ff3', '#f368e0',
];

function HabitsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { habits, completionRate } = useHabits();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<HabitFormData>({
    name: '',
    frequency: 'daily',
    color: HABIT_COLORS[0],
  });

  useEffect(() => {
    if (searchParams.get('add') === 'true') setShowForm(true);
  }, [searchParams]);

  const handleToggle = async (habitId: string) => {
    if (!user) return;
    await toggleHabitLog(user.id, habitId, getToday());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    await createHabit(user.id, form);
    showToast('Habit created!', 'success');
    setShowForm(false);
    setForm({ name: '', frequency: 'daily', color: HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)] });
  };

  const handleDelete = async (id: string) => {
    await deleteHabit(id);
    showToast('Habit deleted', 'info');
  };

  return (
    <div className="page">
      {/* Completion ring */}
      <div className={styles.progressSection}>
        <div className={styles.ring}>
          <svg viewBox="0 0 100 100" className={styles.ringSvg}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-primary)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="url(#habitGradient)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - completionRate / 100)}`}
              transform="rotate(-90 50 50)"
              className={styles.ringProgress}
            />
            <defs>
              <linearGradient id="habitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-primary)" />
                <stop offset="100%" stopColor="var(--accent-secondary)" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.ringText}>
            <span className={styles.ringValue}>{completionRate}%</span>
            <span className={styles.ringLabel}>Today</span>
          </div>
        </div>
        <p className={styles.progressSub}>
          {habits.filter(h => h.completedToday).length} of {habits.length} habits completed
        </p>
      </div>

      {/* Habit list */}
      <div className={styles.habitList}>
        {habits.length === 0 ? (
          <div className="empty-state">
            <Target className="empty-state-icon" />
            <h3 className="empty-state-title">No habits yet</h3>
            <p className="empty-state-description">Start building positive habits today</p>
          </div>
        ) : (
          habits.map(habit => (
            <div
              key={habit.id}
              className={`${styles.habitItem} ${habit.completedToday ? styles.habitCompleted : ''}`}
            >
              <button
                className={styles.habitToggle}
                onClick={() => handleToggle(habit.id)}
                style={{
                  borderColor: habit.color,
                  background: habit.completedToday ? habit.color : 'transparent',
                }}
              >
                {habit.completedToday && <Check size={16} color="white" strokeWidth={3} />}
              </button>
              <div className={styles.habitContent}>
                <span className={styles.habitName}>{habit.name}</span>
                <div className={styles.habitMeta}>
                  {habit.streak > 0 && (
                    <span className={styles.streak}>
                      <Flame size={12} color="var(--accent-warning)" />
                      {habit.streak} day streak
                    </span>
                  )}
                  <span className="badge badge-neutral">{habit.frequency}</span>
                </div>
              </div>
              <button
                className={styles.habitDelete}
                onClick={() => handleDelete(habit.id)}
                aria-label="Delete habit"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      <button className={styles.addBtn} onClick={() => setShowForm(true)} id="add-habit-btn">
        <Plus size={20} />
        <span>Add Habit</span>
      </button>

      {/* Form */}
      {showForm && (
        <>
          <div className="modal-backdrop" onClick={() => setShowForm(false)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)' }}>New Habit</h2>
                <button className="btn-icon btn-ghost" onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="form">
                <div className="input-group">
                  <input
                    className="input"
                    placeholder="Habit name (e.g., Exercise, Reading)"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Frequency</label>
                  <div className="tabs">
                    {(['daily', 'weekly', 'monthly'] as HabitFrequency[]).map(f => (
                      <button
                        key={f}
                        type="button"
                        className={`tab ${form.frequency === f ? 'tab-active' : ''}`}
                        onClick={() => setForm({ ...form, frequency: f })}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Color</label>
                  <div className={styles.colorPicker}>
                    {HABIT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorDot} ${form.color === color ? styles.colorDotActive : ''}`}
                        style={{ background: color }}
                        onClick={() => setForm({ ...form, color })}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={!form.name.trim()}>
                  Create Habit
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>}>
      <HabitsContent />
    </Suspense>
  );
}
