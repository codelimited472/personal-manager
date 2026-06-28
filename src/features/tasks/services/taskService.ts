import { getDB } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { generateId, getTodayISO } from '@/lib/utils';
import type { Task, TaskFormData, TaskStatus } from '../types';

/**
 * Create a new task — writes to Dexie first, then queues sync
 */
export async function createTask(userId: string, data: TaskFormData): Promise<Task> {
  const db = getDB();
  const now = getTodayISO();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task: any = {
    id: generateId(),
    user_id: userId,
    ...data,
    status: 'pending',
    completed_at: undefined,
    created_at: now,
    updated_at: now,
    _syncStatus: 'pending',
  };

  await db.tasks.add(task);

  // Async sync to Supabase (fire and forget)
  syncTaskToSupabase(task).catch(console.error);

  return task;
}

/**
 * Update a task
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = getDB();

  await db.tasks.update(id, {
    ...updates,
    updated_at: getTodayISO(),
    _syncStatus: 'pending',
  });

  // Async sync
  const task = await db.tasks.get(id);
  if (task) syncTaskToSupabase(task).catch(console.error);
}

/**
 * Toggle task completion
 */
export async function toggleTask(id: string): Promise<void> {
  const db = getDB();
  const task = await db.tasks.get(id);
  if (!task) return;

  const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
  await updateTask(id, {
    status: newStatus,
    completed_at: newStatus === 'completed' ? getTodayISO() : undefined,
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const db = getDB();

  // Delete from Supabase
  try {
    const supabase = createClient();
    await supabase.from('tasks').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete from Supabase:', err);
  }

  // Delete locally
  await db.tasks.delete(id);
}

/**
 * Get tasks for a specific date
 */
export async function getTasksByDate(userId: string, date: string): Promise<Task[]> {
  const db = getDB();
  return await db.tasks
    .where('user_id')
    .equals(userId)
    .filter(task => {
      if (!task.due_date) return false;
      return task.due_date.startsWith(date);
    })
    .toArray();
}

/**
 * Get all pending tasks
 */
export async function getPendingTasks(userId: string): Promise<Task[]> {
  const db = getDB();
  return await db.tasks
    .where('[user_id+status]')
    .equals([userId, 'pending'])
    .toArray()
    .catch(() => {
      // Fallback if compound index doesn't exist
      return db.tasks
        .where('user_id')
        .equals(userId)
        .filter(t => t.status === 'pending' || t.status === 'in_progress')
        .toArray();
    });
}

/**
 * Sync a single task to Supabase
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncTaskToSupabase(task: any): Promise<void> {
  try {
    const supabase = createClient();
    const { _syncStatus, ...data } = task as Record<string, unknown>;
    void _syncStatus;

    const { error } = await supabase
      .from('tasks')
      .upsert(data, { onConflict: 'id' });

    if (!error) {
      const db = getDB();
      await db.tasks.update(task.id, {
        _syncStatus: 'synced',
        _lastSyncedAt: getTodayISO(),
      });
    }
  } catch {
    // Will sync later
  }
}
