'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getToday } from '@/lib/utils';
import type { HabitWithStatus } from '../types';

export function useHabits() {
  const { user } = useAuth();
  const userId = user?.id;
  const today = getToday();

  const habits = useLiveQuery(
    async (): Promise<HabitWithStatus[]> => {
      if (!userId) return [];
      const db = getDB();

      const allHabits = await db.habits
        .where('user_id')
        .equals(userId)
        .filter(h => h.is_active)
        .toArray();

      // Get today's logs and compute streaks
      const result: HabitWithStatus[] = await Promise.all(
        allHabits.map(async habit => {
          const todayLog = await db.habitLogs
            .where('[habit_id+date]')
            .equals([habit.id, today])
            .first();

          // Simple streak calculation
          let streak = 0;
          const { subDays, format } = await import('date-fns');
          for (let i = 0; i < 365; i++) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const log = await db.habitLogs
              .where('[habit_id+date]')
              .equals([habit.id, dateStr])
              .first();

            if (log?.completed) {
              streak++;
            } else if (i > 0) {
              break;
            }
          }

          return {
            ...habit,
            completedToday: todayLog?.completed ?? false,
            streak,
          };
        })
      );

      return result;
    },
    [userId, today],
    [] as HabitWithStatus[]
  );

  const completionRate = habits.length > 0
    ? Math.round((habits.filter(h => h.completedToday).length / habits.length) * 100)
    : 0;

  return { habits, completionRate };
}
