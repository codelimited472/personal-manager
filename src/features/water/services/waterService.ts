import { getDB } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { generateId, getTodayISO, getToday } from '@/lib/utils';

export async function addWater(userId: string, amount: number): Promise<void> {
  const db = getDB();
  const log = {
    id: generateId(),
    user_id: userId,
    date: getToday(),
    amount,
    created_at: getTodayISO(),
    _syncStatus: 'pending' as const,
  };

  await db.waterLogs.add(log);

  // Async sync
  try {
    const supabase = createClient();
    const { _syncStatus, ...data } = log;
    void _syncStatus;
    await supabase.from('water_logs').upsert(data, { onConflict: 'id' });
  } catch { /* offline */ }
}

export async function getTodayWater(userId: string): Promise<number> {
  const db = getDB();
  const today = getToday();
  const logs = await db.waterLogs
    .where('user_id')
    .equals(userId)
    .filter(l => l.date === today)
    .toArray();

  return logs.reduce((sum, l) => sum + l.amount, 0);
}

export async function deleteLastWaterLog(userId: string): Promise<void> {
  const db = getDB();
  const today = getToday();
  const logs = await db.waterLogs
    .where('user_id')
    .equals(userId)
    .filter(l => l.date === today)
    .sortBy('created_at');

  if (logs.length > 0) {
    const last = logs[logs.length - 1];
    try {
      const supabase = createClient();
      await supabase.from('water_logs').delete().eq('id', last.id);
    } catch { /* offline */ }
    await db.waterLogs.delete(last.id);
  }
}
