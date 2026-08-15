import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { dailyTrackerService } from '../services/dailyTrackerService';
import { DailyActivityFormData } from '../types';

export function useDailyTracker(userId: string | undefined, date: string) {
  const activities = useLiveQuery(
    async () => {
      if (!userId) return [];
      return await dailyTrackerService.getActivitiesByDate(userId, date);
    },
    [userId, date],
    []
  );

  const addActivity = async (data: DailyActivityFormData) => {
    if (!userId) throw new Error('User not authenticated');
    return await dailyTrackerService.addActivity(userId, date, data);
  };

  const updateActivity = async (id: string, data: Partial<DailyActivityFormData>) => {
    return await dailyTrackerService.updateActivity(id, data);
  };

  const deleteActivity = async (id: string) => {
    return await dailyTrackerService.deleteActivity(id);
  };

  return {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    isLoading: activities === undefined
  };
}
