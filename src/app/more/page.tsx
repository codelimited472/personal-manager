'use client';

import { useRouter } from 'next/navigation';
import {
  Car, FileText, Shirt, Archive, Compass, Briefcase, MapPin, List as ListIcon, Lightbulb, BarChart3, Settings, BookOpen, Scissors
} from 'lucide-react';
import styles from './more.module.css';

const moreMenu = [
  { label: 'Business Workspaces', icon: Briefcase, href: '/business', color: 'var(--accent-primary)' },
  { label: 'Document Vault', icon: FileText, href: '/documents', color: 'var(--accent-info)' },
  { label: 'Wardrobe & Outfits', icon: Shirt, href: '/wardrobe', color: 'var(--accent-danger)' },
  { label: 'Vehicles & Issues', icon: Car, href: '/vehicles', color: 'var(--accent-warning)' },
  { label: 'Notes', icon: BookOpen, href: '/notes', color: 'var(--accent-primary)' },
  { label: 'Travel & Packing', icon: Compass, href: '/travel', color: 'var(--accent-secondary)' },
  { label: 'Inventory & Expiries', icon: Archive, href: '/inventory', color: 'var(--accent-success)' },
  { label: 'Places & Restaurants', icon: MapPin, href: '/places', color: 'var(--accent-info)' },
  { label: 'Reports & Analytics', icon: BarChart3, href: '/analytics', color: 'var(--accent-secondary)' },
  { label: 'Lists', icon: ListIcon, href: '/lists', color: 'var(--accent-warning)' },
  { label: 'Haircut Tracker', icon: Scissors, href: '/haircuts', color: 'var(--accent-danger)' },
  { label: 'Settings', icon: Settings, href: '/settings', color: 'var(--accent-primary)' },
];

export default function MorePage() {
  const router = useRouter();

  return (
    <div className="page">
      <div className={styles.menuGrid}>
        {moreMenu.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={styles.menuCard}
          >
            <div className={styles.iconWrapper} style={{ background: item.color }}>
              <item.icon size={22} color="white" />
            </div>
            <span className={styles.menuLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
