'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Clock,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './BottomNav.module.css';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/expenses', icon: Wallet, label: 'Expenses' },
  { href: '/daily-tracker', icon: Clock, label: 'Tracker' },
  { href: '/more', icon: Menu, label: 'More' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show on login page
  if (pathname === '/login') return null;

  return (
    <nav className={styles.nav} id="bottom-nav" aria-label="Main navigation">
      {navItems.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(styles.navItem, isActive && styles.navItemActive)}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon
              size={22}
              className={cn(styles.navIcon, isActive && styles.navIconActive)}
            />
            <span className={cn(styles.navLabel, isActive && styles.navLabelActive)}>
              {item.label}
            </span>
            {isActive && <span className={styles.navIndicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
