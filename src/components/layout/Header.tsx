'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Search, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { cn } from '@/lib/utils';
import styles from './Header.module.css';
import { getDB } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showSync?: boolean;
  rightAction?: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': 'Personal Manager',
  '/tasks': 'Tasks',
  '/daily-tracker': 'Daily Tracker',
  '/water': 'Water Tracker',
  '/expenses': 'Expenses',
  '/vehicles': 'Vehicles',
  '/documents': 'Documents',
  '/wardrobe': 'Wardrobe',
  '/inventory': 'Inventory',
  '/ideas': 'Ideas',
  '/notes': 'Notes',
  '/business': 'Businesses & Ideas',
  '/travel': 'Travel',
  '/places': 'Places',
  '/food': 'Food & Restaurants',
  '/lists': 'Lists',
  '/employees': 'Employees',
  '/backpack': 'Packing',
  '/expiry': 'Expiry Tracker',
  '/settings': 'Settings',
  '/search': 'Search',
  '/events': 'Important Dates',
  '/more': 'More',
  '/settings/sync-debug': 'Sync Diagnostics',
};

export default function Header({ title, showBack, showSearch = true, showSync = true, rightAction }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { syncState, pendingCount } = useSync();
  const db = getDB();

  const isBusinessDetail = pathname?.match(/^\/business\/([^\/]+)$/);
  const businessId = isBusinessDetail ? isBusinessDetail[1] : null;

  const workspace = useLiveQuery(() => {
    return businessId ? db.businessWorkspaces.get(businessId) : undefined;
  }, [businessId]);

  if (pathname === '/login') return null;

  let pageTitle = title || pageTitles[pathname];
  if (!pageTitle && pathname?.startsWith('/business/')) {
    pageTitle = 'Businesses & Ideas';
  }
  if (!pageTitle) {
    pageTitle = 'Personal Manager';
  }
  const isHome = pathname === '/';

  return (
    <header className={styles.header} id="app-header">
      <div className={styles.headerLeft}>
        {(showBack || !isHome) && !isHome ? (
          <button
            className={styles.headerBtn}
            onClick={() => router.back()}
            aria-label="Go back"
            id="header-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        
        {workspace ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1 className={styles.headerTitle} style={{ fontSize: '1rem', marginTop: '2px' }}>
              {workspace.name}
            </h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '999px', background: 'var(--accent-primary-muted)', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                {workspace.status || 'Draft'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {new Date(workspace.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <h1 className={cn(styles.headerTitle, isHome && styles.headerTitleHome)}>
            {pageTitle}
          </h1>
        )}
      </div>

      <div className={styles.headerRight}>
        {showSync && (
          <div className={styles.syncBadge} title={`Sync: ${syncState}`}>
            <span
              className={cn(
                styles.syncDot,
                syncState === 'synced' && styles.syncDotSynced,
                syncState === 'syncing' && styles.syncDotSyncing,
                syncState === 'offline' && styles.syncDotOffline,
                syncState === 'error' && styles.syncDotError,
              )}
            />
            {pendingCount > 0 && (
              <span className={styles.syncCount}>{pendingCount}</span>
            )}
          </div>
        )}

        {showSearch && !workspace && (
          <button
            className={styles.headerBtn}
            onClick={() => router.push('/search')}
            aria-label="Search"
            id="header-search-btn"
          >
            <Search size={20} />
          </button>
        )}

        {workspace && (
          <button
            className={styles.headerBtn}
            onClick={() => {
              // The 3-dot menu actions can be handled here or globally later.
              alert('More options coming soon!');
            }}
            aria-label="More"
          >
            <MoreHorizontal size={20} />
          </button>
        )}

        {rightAction}
      </div>
    </header>
  );
}
