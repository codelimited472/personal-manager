'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Task, TaskStatus } from '../types';
import { getToday } from '@/lib/utils';

export function useTasks(filter?: {
  status?: TaskStatus;
  date?: string;
  category?: string;
}) {
  const { user } = useAuth();
  const userId = user?.id || 'local-user';

  const tasks = useLiveQuery(
    async () => {
      if (!userId) return [];
      const db = getDB();

      let query = db.tasks.where('user_id').equals(userId);

      let results = await query.toArray();

      // Apply filters
      if (filter?.status) {
        results = results.filter(t => t.status === filter.status);
      }

      if (filter?.date) {
        results = results.filter(t => t.due_date?.startsWith(filter.date!));
      }

      if (filter?.category) {
        results = results.filter(t => t.category === filter.category);
      }

      // Sort: pending first, then by priority, then by due date
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

      return results.sort((a, b) => {
        // Completed tasks at the bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;

        // Sort by priority
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;

        // Sort by due date (earliest first)
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        return 0;
      });
    },
    [userId, filter?.status, filter?.date, filter?.category],
    [] as Task[]
  );

  const todayTasks = useLiveQuery(
    async () => {
      if (!userId) return [];
      const db = getDB();
      const today = getToday();

      return db.tasks
        .where('user_id')
        .equals(userId)
        .filter(t =>
          Boolean(
            (t.status === 'pending' && (!t.due_date || t.due_date <= today)) ||
            (t.status === 'completed' && (t.due_date?.startsWith(today) || t.completed_at?.startsWith(today)))
          )
        )
        .toArray();
    },
    [userId],
    [] as Task[]
  );

  const stats = useLiveQuery(
    async () => {
      if (!userId) return { total: 0, completed: 0, pending: 0, overdue: 0 };
      const db = getDB();
      const all = await db.tasks.where('user_id').equals(userId).toArray();
      const today = getToday();

      return {
        total: all.length,
        completed: all.filter(t => t.status === 'completed').length,
        pending: all.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
        overdue: all.filter(t =>
          t.status === 'pending' &&
          t.due_date &&
          t.due_date < today
        ).length,
      };
    },
    [userId],
    { total: 0, completed: 0, pending: 0, overdue: 0 }
  );

  const upcomingTasks = useLiveQuery(
    async () => {
      if (!userId) return [];
      const db = getDB();
      const today = getToday();

      return db.tasks
        .where('user_id')
        .equals(userId)
        .filter(t =>
          t.status === 'pending' && !!t.due_date && t.due_date > today
        )
        .toArray();
    },
    [userId],
    [] as Task[]
  );

  return { tasks, todayTasks, upcomingTasks, stats };
}
