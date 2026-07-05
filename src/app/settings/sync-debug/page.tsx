'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDB } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { tableMap, type SyncableTable } from '@/lib/sync';
import { ArrowLeft, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '../settings.module.css';

export default function SyncDebugPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<{table: string; recordId: string; error: string; data: any}[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const analyzeSyncErrors = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    setLogs([]);
    
    const db = getDB();
    const supabase = createClient();
    const tables = Object.keys(tableMap) as SyncableTable[];
    const newLogs: any[] = [];

    for (const table of tables) {
      const pending = await (db[table] as any)
        .where('_syncStatus')
        .equals('pending')
        .toArray();

      if (pending.length > 0) {
        const supabaseTable = tableMap[table];
        const idField = table === 'settings' ? 'key' : 'id';

        for (const record of pending) {
          const { _syncStatus, _lastSyncedAt, ...data } = record;
          if (data.user_id === 'local-user') {
            data.user_id = user.id;
          }

          if (record[idField] !== 'local-user') {
            // Attempt a dry run or actual push to catch the exact error
            const { error } = await supabase
              .from(supabaseTable)
              .upsert(data, { onConflict: idField });
              
            if (error) {
              newLogs.push({
                table,
                recordId: record[idField],
                error: error.message || JSON.stringify(error),
                data
              });
            } else {
              // If it actually succeeded, mark as synced
              await (db[table] as any).update(record[idField], {
                _syncStatus: 'synced',
                _lastSyncedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
    
    setLogs(newLogs);
    setIsAnalyzing(false);
  };

  const forceResolveAll = async () => {
    if (!confirm('This will mark all stuck items as "synced" locally without pushing them to Supabase (they will stay on this device but won\'t sync to others). Proceed?')) return;
    
    setIsFixing(true);
    const db = getDB();
    const tables = Object.keys(tableMap) as SyncableTable[];
    let fixedCount = 0;

    for (const table of tables) {
      const pending = await (db[table] as any)
        .where('_syncStatus')
        .equals('pending')
        .toArray();

      for (const record of pending) {
        const idField = table === 'settings' ? 'key' : 'id';
        await (db[table] as any).update(record[idField], {
          _syncStatus: 'synced',
          _lastSyncedAt: new Date().toISOString(),
        });
        fixedCount++;
      }
    }

    alert(`Marked ${fixedCount} items as synced locally.`);
    setIsFixing(false);
    setLogs([]);
  };

  const deletePendingData = async () => {
    if (!confirm('WARNING: This will permanently DELETE all offline data that hasn\'t been synced yet! Proceed?')) return;
    
    setIsFixing(true);
    const db = getDB();
    const tables = Object.keys(tableMap) as SyncableTable[];
    let deletedCount = 0;

    for (const table of tables) {
      const pending = await (db[table] as any)
        .where('_syncStatus')
        .equals('pending')
        .toArray();

      for (const record of pending) {
        const idField = table === 'settings' ? 'key' : 'id';
        await (db[table] as any).delete(record[idField]);
        deletedCount++;
      }
    }

    alert(`Deleted ${deletedCount} stuck items.`);
    setIsFixing(false);
    setLogs([]);
  };

  return (
    <div className="page" style={{ padding: '20px', overflowY: 'auto' }}>
      <div className={styles.section}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Use this tool to find out why items are stuck in "pending" status and aren't syncing across your devices.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button 
            onClick={analyzeSyncErrors} 
            disabled={isAnalyzing || isFixing}
            style={{ padding: '10px 15px', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={16} className={isAnalyzing ? 'spin' : ''} />
            Analyze Pending Data
          </button>
          
          <button 
            onClick={forceResolveAll} 
            disabled={isAnalyzing || isFixing}
            style={{ padding: '10px 15px', background: 'var(--border-secondary)', color: 'var(--text-primary)', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <CheckCircle size={16} />
            Force Mark as Synced
          </button>

          <button 
            onClick={deletePendingData} 
            disabled={isAnalyzing || isFixing}
            style={{ padding: '10px 15px', background: '#EF4444', color: 'white', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Trash2 size={16} />
            Delete Stuck Items
          </button>
        </div>

        {logs.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertCircle size={20} /> Found {logs.length} Sync Errors
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ padding: '15px', background: 'var(--bg-surface-hover)', borderRadius: '8px', borderLeft: '4px solid #EF4444' }}>
                  <strong>Table:</strong> {log.table} <br/>
                  <strong>Record ID:</strong> {log.recordId} <br/>
                  <strong style={{ color: '#EF4444' }}>Error:</strong> {log.error} <br/>
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>View Data</summary>
                    <pre style={{ fontSize: '12px', background: 'var(--bg-card)', padding: '10px', borderRadius: '4px', overflowX: 'auto', marginTop: '5px' }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {logs.length === 0 && !isAnalyzing && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No errors currently found. Click "Analyze" to check Supabase rejection reasons.
          </div>
        )}
      </div>
    </div>
  );
}
