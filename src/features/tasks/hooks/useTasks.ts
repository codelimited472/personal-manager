'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Task, TaskStatus } from '../types';
import { getToday, isSameDayLocal } from '@/lib/utils';

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
        const queryDate = filter.date;
        const today = getToday();
        
        if (queryDate <= today) {
          results = results.filter(t => {
            const completedOnDate = t.status === 'completed' && isSameDayLocal(t.completed_at, queryDate);
            const dueOnDate = t.due_date?.startsWith(queryDate);
            const createdOnOrBefore = t.created_at.split('T')[0] <= queryDate;
            const wasPending = createdOnOrBefore && (t.status !== 'completed' || (t.completed_at && t.completed_at > queryDate));
            return completedOnDate || dueOnDate || wasPending;
          }).map(t => {
            const isCompletedLater = t.status === 'completed' && t.completed_at && t.completed_at > queryDate && !isSameDayLocal(t.completed_at, queryDate);
            if (isCompletedLater || t.status === 'pending') {
              // If it's a past date (or today but not completed today), we know it wasn't completed ON that date.
              // If queryDate < today, it's definitely carried forward to next day.
              if (queryDate < today) {
                return { ...t, status: 'carried_forward' as any };
              }
              return { ...t, status: 'pending' };
            }
            return t;
          });
        } else {
          // Future date: show tasks due on that date OR pending tasks that will be carried forward
          results = results.filter(t => {
            const dueOnDate = t.due_date?.startsWith(queryDate);
            const createdBeforeFuture = t.created_at.split('T')[0] <= queryDate;
            const isStillPending = t.status !== 'completed' || (t.completed_at && t.completed_at > queryDate);
            return dueOnDate || (createdBeforeFuture && isStillPending);
          }).map(t => {
            if (t.status === 'completed' && t.completed_at && t.completed_at > queryDate) {
              return { ...t, status: 'pending' };
            }
            return t;
          });
        }
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
            (t.status === 'completed' && isSameDayLocal(t.completed_at, today))
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
      const queryDate = filter?.date || getToday();
      const today = getToday();

      if (queryDate === today) {
        const pendingOnToday = all.filter(t => {
          const createdBefore = t.created_at.split('T')[0] <= today;
          return createdBefore && (t.status === 'pending' || t.status === 'in_progress');
        });
        const completedToday = all.filter(t => t.status === 'completed' && isSameDayLocal(t.completed_at, today));
        return {
          total: pendingOnToday.length + completedToday.length,
          completed: completedToday.length,
          pending: pendingOnToday.length,
          overdue: all.filter(t => t.status === 'pending' && t.due_date && t.due_date < today).length,
        };
      } else if (queryDate < today) {
        const pendingOnDate = all.filter(t => {
          const createdBefore = t.created_at.split('T')[0] <= queryDate;
          const notCompletedByThen = t.status !== 'completed' || (t.completed_at && t.completed_at > queryDate);
          return createdBefore && notCompletedByThen;
        });
        const completedOnDate = all.filter(t => t.status === 'completed' && isSameDayLocal(t.completed_at, queryDate));
        return {
          total: pendingOnDate.length + completedOnDate.length,
          completed: completedOnDate.length,
          pending: pendingOnDate.length,
          overdue: pendingOnDate.filter(t => t.due_date && t.due_date < queryDate).length,
        };
      } else {
        // Future dates
        const pendingOnDate = all.filter(t => {
          const createdBefore = t.created_at.split('T')[0] <= queryDate;
          const notCompletedByThen = t.status !== 'completed' || (t.completed_at && t.completed_at > queryDate);
          return createdBefore && notCompletedByThen;
        });
        const completedOnDate = all.filter(t => t.status === 'completed' && isSameDayLocal(t.completed_at, queryDate));
        
        return {
          total: pendingOnDate.length + completedOnDate.length,
          completed: completedOnDate.length,
          pending: pendingOnDate.length,
          overdue: 0,
        };
      }
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
