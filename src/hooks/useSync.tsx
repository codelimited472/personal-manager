'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { syncAll, getPendingCount } from '@/lib/sync';
import { useOnline } from './useOnline';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface SyncContextType {
  syncState: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isOnline = useOnline();

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // DB not ready yet
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!userId || !isOnline) {
      setSyncState(isOnline ? 'idle' : 'offline');
      return;
    }

    try {
      setSyncState('syncing');
      await syncAll(userId);
      setLastSyncedAt(new Date());
      setSyncState('synced');
      await updatePendingCount();

      // Reset to idle after 3 seconds
      setTimeout(() => setSyncState('idle'), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState('error');
      setTimeout(() => setSyncState('idle'), 5000);
    }
  }, [userId, isOnline, updatePendingCount]);

  // Sync on mount, when coming back online, and periodically
  useEffect(() => {
    if (!userId) return;

    // Initial sync
    triggerSync();
    updatePendingCount();

    // Periodic sync every 30 seconds
    const interval = setInterval(() => {
      triggerSync();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, triggerSync, updatePendingCount]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && userId) {
      triggerSync();
    } else if (!isOnline) {
      setSyncState('offline');
    }
  }, [isOnline, userId, triggerSync]);

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return (
    <SyncContext.Provider value={{ syncState, pendingCount, lastSyncedAt, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
