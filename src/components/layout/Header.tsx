'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, ArrowLeft } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { cn } from '@/lib/utils';
import styles from './Header.module.css';

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
  '/habits': 'Habits',
  '/water': 'Water Tracker',
  '/expenses': 'Expenses',
  '/vehicles': 'Vehicles',
  '/documents': 'Documents',
  '/wardrobe': 'Wardrobe',
  '/inventory': 'Inventory',
  '/ideas': 'Ideas',
  '/notes': 'Notes',
  '/businesses': 'Businesses',
  '/travel': 'Travel',
  '/places': 'Places',
  '/food': 'Food & Restaurants',
  '/shopping': 'Shopping List',
  '/employees': 'Employees',
  '/backpack': 'Packing',
  '/expiry': 'Expiry Tracker',
  '/settings': 'Settings',
  '/search': 'Search',
  '/more': 'More',
};

export default function Header({ title, showBack, showSearch = true, showSync = true, rightAction }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { syncState, pendingCount } = useSync();

  if (pathname === '/login') return null;

  const pageTitle = title || pageTitles[pathname] || 'Personal Manager';
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
        <h1 className={cn(styles.headerTitle, isHome && styles.headerTitleHome)}>
          {pageTitle}
        </h1>
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

        {showSearch && (
          <button
            className={styles.headerBtn}
            onClick={() => router.push('/search')}
            aria-label="Search"
            id="header-search-btn"
          >
            <Search size={20} />
          </button>
        )}

        {rightAction}
      </div>
    </header>
  );
}
