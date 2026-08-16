import { v4 as uuidv4 } from 'uuid';
import { getDB } from '@/lib/db';
import { DailyActivity, DailyActivityFormData } from '../types';

export const dailyTrackerService = {
  async getActivitiesByDate(userId: string, date: string): Promise<DailyActivity[]> {
    const db = getDB();
    const records = await db.dailyActivities
      .where('user_id').equals(userId)
      .toArray();

    return records
      .filter(r => r.date === date)
      .map(r => ({
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        start_time: r.start_time,
        end_time: r.end_time,
        title: r.title,
        category: r.category,
        color: r.color,
        description: r.description,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  },

  async addActivity(userId: string, date: string, data: DailyActivityFormData): Promise<DailyActivity> {
    const db = getDB();
    const newActivity = {
      id: uuidv4(),
      user_id: userId,
      date,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    };

    await db.dailyActivities.add(newActivity);

    if (data.title && data.color) {
      await db.dailyActivities
        .filter(a => a.title === data.title)
        .modify({ color: data.color, _syncStatus: 'pending', updated_at: new Date().toISOString() });
    }

    const { _syncStatus, ...activity } = newActivity;
    return activity as DailyActivity;
  },

  async updateActivity(id: string, data: Partial<DailyActivityFormData>): Promise<void> {
    const db = getDB();
    await db.dailyActivities.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending' as const,
    });

    if (data.title && data.color) {
      await db.dailyActivities
        .filter(a => a.title === data.title)
        .modify({ color: data.color, _syncStatus: 'pending', updated_at: new Date().toISOString() });
    }
  },

  async deleteActivity(id: string): Promise<void> {
    const db = getDB();
    await db.dailyActivities.delete(id);
    
    if (typeof window !== 'undefined') {
      try {
        const queueJson = localStorage.getItem('sync_deletion_queue');
        const queue = queueJson ? JSON.parse(queueJson) : [];
        queue.push({ table: 'dailyActivities', id });
        localStorage.setItem('sync_deletion_queue', JSON.stringify(queue));
      } catch (e) {
        console.error('Failed to queue deletion:', e);
      }
    }
  }
};
