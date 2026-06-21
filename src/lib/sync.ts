import { createClient } from '@/lib/supabase/client';
import { getDB, type SyncStatus } from '@/lib/db';

type SyncableTable = 
  | 'tasks' | 'habits' | 'habitLogs' | 'waterLogs' | 'expenses' 
  | 'captures' | 'notifications' | 'settings'
  | 'vehicles' | 'vehicleIssues' | 'petrolExpenses' 
  | 'employeeProfiles' | 'employeeExpenses' | 'trips' | 'tripExpenses' | 'tripPackingItems'
  | 'places' | 'restaurants' | 'buyItems' | 'inventoryItems' | 'expiryItems'
  | 'wardrobeItems' | 'outfits' | 'documents' | 'businessWorkspaces' | 'businessTasks'
  | 'businessNotes' | 'businessIdeas' | 'businessDocuments' | 'businessContacts'
  | 'notes' | 'ideas';

// Maps local Dexie table names to Supabase table names
const tableMap: Record<SyncableTable, string> = {
  tasks: 'tasks',
  habits: 'habits',
  habitLogs: 'habit_logs',
  waterLogs: 'water_logs',
  expenses: 'expenses',
  captures: 'captures',
  notifications: 'notifications',
  settings: 'settings',
  vehicles: 'vehicles',
  vehicleIssues: 'vehicle_issues',
  petrolExpenses: 'petrol_expenses',
  employeeProfiles: 'employee_profiles',
  employeeExpenses: 'employee_expenses',
  trips: 'trips',
  tripExpenses: 'trip_expenses',
  tripPackingItems: 'trip_packing_items',
  places: 'places',
  restaurants: 'restaurants',
  buyItems: 'buy_items',
  inventoryItems: 'inventory_items',
  expiryItems: 'expiry_items',
  wardrobeItems: 'wardrobe_items',
  outfits: 'outfits',
  documents: 'documents',
  businessWorkspaces: 'business_workspaces',
  businessTasks: 'business_tasks',
  businessNotes: 'business_notes',
  businessIdeas: 'business_ideas',
  businessDocuments: 'business_documents',
  businessContacts: 'business_contacts',
  notes: 'notes',
  ideas: 'ideas',
};

/**
 * Push all pending local changes to Supabase
 */
export async function pushPendingChanges(tableName: SyncableTable, userId: string): Promise<number> {
  const db = getDB();
  const supabase = createClient();
  const supabaseTable = tableMap[tableName];

  // Get all pending records
  const pending = await (db[tableName] as ReturnType<typeof db.table>)
    .where('_syncStatus')
    .equals('pending')
    .toArray();

  if (pending.length === 0) return 0;

  let synced = 0;

  for (const record of pending as any[]) {
    try {
      // Remove local-only fields before sending to Supabase
      const { _syncStatus, _lastSyncedAt, ...data } = record;

      const idField = tableName === 'settings' ? 'key' : 'id';

      if (data.user_id === 'local-user') {
        data.user_id = userId;
        // Fix it in the local DB so it doesn't stay as local-user or get duplicated on pull
        await (db[tableName] as ReturnType<typeof db.table>).update(record[idField], { user_id: userId });
      }

      if (record[idField] === 'local-user') {
        // e.g. settings key='local-user', just mark as synced so it doesn't block
        await (db[tableName] as ReturnType<typeof db.table>).update(record[idField], {
          _syncStatus: 'synced' as SyncStatus,
        });
        continue;
      }

      const { error } = await supabase
        .from(supabaseTable)
        .upsert(data, { onConflict: idField });

      if (!error) {
        // Mark as synced in local DB
        await (db[tableName] as ReturnType<typeof db.table>).update(record[idField], {
          _syncStatus: 'synced' as SyncStatus,
          _lastSyncedAt: new Date().toISOString(),
        });
        synced++;
      } else {
        console.warn(`[Sync] Push warning for ${tableName}:`, error.message || JSON.stringify(error));
      }
    } catch (err) {
      console.error(`Failed to sync ${tableName} record:`, err);
    }
  }

  return synced;
}

/**
 * Pull latest data from Supabase into local Dexie
 */
export async function pullFromSupabase(
  tableName: SyncableTable,
  userId: string,
  lastSyncedAt?: string
): Promise<number> {
  const db = getDB();
  const supabase = createClient();
  const supabaseTable = tableMap[tableName];

  let query = supabase
    .from(supabaseTable)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  // Only pull records updated after last sync
  if (lastSyncedAt) {
    query = query.gt('created_at', lastSyncedAt);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[Sync] Pull warning for ${tableName}:`, error.message || JSON.stringify(error));
    return 0;
  }

  if (!data || data.length === 0) return 0;

  // Upsert into local DB
  const localRecords = data.map((record: Record<string, unknown>) => ({
    ...record,
    _syncStatus: 'synced' as SyncStatus,
    _lastSyncedAt: new Date().toISOString(),
  }));

  await (db[tableName] as ReturnType<typeof db.table>).bulkPut(localRecords);

  return data.length;
}

/**
 * Full sync: push pending, then pull latest
 */
export async function syncTable(tableName: SyncableTable, userId: string): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushPendingChanges(tableName, userId);
  const pulled = await pullFromSupabase(tableName, userId);
  return { pushed, pulled };
}

/**
 * Sync all tables
 */
export async function syncAll(userId: string): Promise<void> {
  const tables: SyncableTable[] = Object.keys(tableMap) as SyncableTable[];

  await Promise.allSettled(
    tables.map(table => syncTable(table, userId))
  );
}

/**
 * Get count of pending (unsynced) records across all tables
 */
export async function getPendingCount(): Promise<number> {
  const db = getDB();
  const tables: SyncableTable[] = Object.keys(tableMap) as SyncableTable[];

  const counts = await Promise.all(
    tables.map(table =>
      (db[table] as ReturnType<typeof db.table>)
        .where('_syncStatus')
        .equals('pending')
        .count()
    )
  );

  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Delete a record locally and from Supabase
 */
export async function deleteRecord(
  tableName: SyncableTable,
  id: string
): Promise<void> {
  const db = getDB();
  const supabase = createClient();
  const supabaseTable = tableMap[tableName];
  const idField = tableName === 'settings' ? 'key' : 'id';

  // Delete from Supabase
  try {
    await supabase.from(supabaseTable).delete().eq(idField, id);
  } catch (err) {
    console.error(`Failed to delete from Supabase:`, err);
  }

  // Delete locally
  await (db[tableName] as ReturnType<typeof db.table>).delete(id);
}
