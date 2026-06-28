import { getDB } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { generateId, getTodayISO } from '@/lib/utils';
import { subDays, format } from 'date-fns';
import type { Habit, HabitFormData, HabitLog } from '../types';

export async function createHabit(userId: string, data: HabitFormData): Promise<Habit> {
  const db = getDB();
  const now = getTodayISO();

  const habit = {
    id: generateId(),
    user_id: userId,
    ...data,
    is_active: true,
    created_at: now,
    updated_at: now,
    _syncStatus: 'pending' as const,
  };

  await db.habits.add(habit);
  syncToSupabase('habits', habit).catch(console.error);
  return habit;
}

export async function toggleHabitLog(userId: string, habitId: string, date: string): Promise<void> {
  const db = getDB();

  // Check if log exists
  const existing = await db.habitLogs
    .where('[habit_id+date]')
    .equals([habitId, date])
    .first();

  if (existing) {
    // Toggle completion
    await db.habitLogs.update(existing.id, {
      completed: !existing.completed,
      _syncStatus: 'pending' as const,
    });
    const updated = await db.habitLogs.get(existing.id);
    if (updated) syncToSupabase('habit_logs', updated).catch(console.error);
  } else {
    // Create new log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log: any = {
      id: generateId(),
      user_id: userId,
      habit_id: habitId,
      date,
      completed: true,
      created_at: getTodayISO(),
      _syncStatus: 'pending',
    };
    await db.habitLogs.add(log);
    syncToSupabase('habit_logs', log).catch(console.error);
  }
}

export async function deleteHabit(id: string): Promise<void> {
  const db = getDB();
  try {
    const supabase = createClient();
    await supabase.from('habits').delete().eq('id', id);
  } catch { /* offline */ }
  await db.habits.delete(id);
  // Also delete related logs
  await db.habitLogs.where('habit_id').equals(id).delete();
}

export async function getStreak(habitId: string): Promise<number> {
  const db = getDB();
  let streak = 0;
  const date = new Date();

  // Check backwards from today
  for (let i = 0; i < 365; i++) {
    const dateStr = format(subDays(date, i), 'yyyy-MM-dd');
    const log = await db.habitLogs
      .where('[habit_id+date]')
      .equals([habitId, dateStr])
      .first();

    if (log?.completed) {
      streak++;
    } else if (i > 0) {
      // Allow today to not be completed yet
      break;
    }
  }

  return streak;
}

export async function getHabitLogsForMonth(habitId: string, year: number, month: number): Promise<HabitLog[]> {
  const db = getDB();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  return db.habitLogs
    .where('habit_id')
    .equals(habitId)
    .filter(log => log.date.startsWith(prefix) && log.completed)
    .toArray();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncToSupabase(table: string, record: any): Promise<void> {
  try {
    const supabase = createClient();
    const { _syncStatus, _lastSyncedAt, ...data } = record;
    void _syncStatus;
    void _lastSyncedAt;
    await supabase.from(table).upsert(data, { onConflict: 'id' });
  } catch { /* will sync later */ }
}
