'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon, CheckSquare, Compass, Wallet, FileText, Lightbulb, Car, Briefcase, MapPin, List as ListIcon, Archive, Calendar, HelpCircle } from 'lucide-react';
import { getDB } from '@/lib/db';
import styles from './search.module.css';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  link: string;
  icon: React.ElementType;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const db = getDB();
        const lowercaseQuery = query.toLowerCase();
        const list: SearchResult[] = [];

        // 1. Tasks
        const tasks = await db.tasks
          .filter(t => t.title.toLowerCase().includes(lowercaseQuery) || (t.description?.toLowerCase().includes(lowercaseQuery) ?? false))
          .toArray();
        tasks.forEach(t => list.push({
          id: t.id,
          type: 'Task',
          title: t.title,
          subtitle: `Priority: ${t.priority} | Status: ${t.status}`,
          link: '/tasks',
          icon: CheckSquare,
        }));

        // 2. Daily Activities
        const activities = await db.dailyActivities
          .filter(a => a.title.toLowerCase().includes(lowercaseQuery) || (a.description?.toLowerCase().includes(lowercaseQuery) ?? false))
          .toArray();
        activities.forEach(a => list.push({
          id: a.id,
          type: 'Daily Tracker',
          title: a.title,
          subtitle: `${a.date} | ${a.start_time} - ${a.end_time}`,
          link: '/daily-tracker',
          icon: Compass,
        }));

        // 3. Expenses
        const expenses = await db.expenses
          .filter(e => e.category.toLowerCase().includes(lowercaseQuery) || (e.description?.toLowerCase().includes(lowercaseQuery) ?? false))
          .toArray();
        expenses.forEach(e => list.push({
          id: e.id,
          type: 'Expense',
          title: `${e.category} - ₹${e.amount}`,
          subtitle: `${e.date} | ${e.description || 'No description'}`,
          link: '/expenses',
          icon: Wallet,
        }));

        // 4. Notes
        const notes = await db.notes
          .filter(n => n.title.toLowerCase().includes(lowercaseQuery) || n.content.toLowerCase().includes(lowercaseQuery))
          .toArray();
        notes.forEach(n => list.push({
          id: n.id,
          type: 'Note',
          title: n.title,
          subtitle: `Content: ${n.content.substring(0, 60)}...`,
          link: '/notes',
          icon: FileText,
        }));

        // 5. Ideas
        const ideas = await db.ideas
          .filter(i => i.title.toLowerCase().includes(lowercaseQuery) || (i.description?.toLowerCase().includes(lowercaseQuery) ?? false))
          .toArray();
        ideas.forEach(i => list.push({
          id: i.id,
          type: 'Idea',
          title: i.title,
          subtitle: `Category: ${i.category} | Status: ${i.status}`,
          link: '/ideas',
          icon: Lightbulb,
        }));

        // 6. Vehicles
        const vehicles = await db.vehicles
          .filter(v => v.name.toLowerCase().includes(lowercaseQuery) || v.registration_number.toLowerCase().includes(lowercaseQuery))
          .toArray();
        vehicles.forEach(v => list.push({
          id: v.id,
          type: 'Vehicle',
          title: v.name,
          subtitle: `Reg: ${v.registration_number}`,
          link: '/vehicles',
          icon: Car,
        }));

        // 7. Documents
        const docs = await db.documents
          .filter(d => d.name.toLowerCase().includes(lowercaseQuery) || d.category.toLowerCase().includes(lowercaseQuery))
          .toArray();
        docs.forEach(d => list.push({
          id: d.id,
          type: 'Document',
          title: d.name,
          subtitle: `Category: ${d.category} ${d.expiry_date ? `| Expires: ${d.expiry_date}` : ''}`,
          link: '/documents',
          icon: FileText,
        }));

        // 8. Business Workspaces
        const workspaces = await db.businessWorkspaces
          .filter(w => w.name.toLowerCase().includes(lowercaseQuery) || w.type.toLowerCase().includes(lowercaseQuery))
          .toArray();
        workspaces.forEach(w => list.push({
          id: w.id,
          type: 'Workspace',
          title: w.name,
          subtitle: `Business Type: ${w.type}`,
          link: '/business',
          icon: Briefcase,
        }));

        // 9. Places
        const places = await db.places
          .filter(p => p.name.toLowerCase().includes(lowercaseQuery) || (p.notes?.toLowerCase().includes(lowercaseQuery) ?? false))
          .toArray();
        places.forEach(p => list.push({
          id: p.id,
          type: 'Place to Visit',
          title: p.name,
          subtitle: `Category: ${p.category} | Priority: ${p.priority}`,
          link: '/travel',
          icon: MapPin,
        }));

        // 10. Notes
        const nItems = await db.notes
          .filter(n => n.title.toLowerCase().includes(lowercaseQuery) || n.content.toLowerCase().includes(lowercaseQuery))
          .toArray();
        nItems.forEach(n => list.push({
          id: n.id,
          type: 'Knowledge Note',
          title: n.title,
          subtitle: `Tags: ${n.tags.join(', ')}`,
          link: '/notes',
          icon: FileText,
        }));
        const inventory = await db.inventoryItems
          .filter(i => i.name.toLowerCase().includes(lowercaseQuery) || i.category.toLowerCase().includes(lowercaseQuery))
          .toArray();
        inventory.forEach(i => list.push({
          id: i.id,
          type: 'Inventory',
          title: i.name,
          subtitle: `Category: ${i.category} | Condition: ${i.condition}`,
          link: '/inventory',
          icon: Archive,
        }));

        // 12. Expiry Items
        const expiry = await db.expiryItems
          .filter(e => e.name.toLowerCase().includes(lowercaseQuery) || e.category.toLowerCase().includes(lowercaseQuery))
          .toArray();
        expiry.forEach(e => list.push({
          id: e.id,
          type: 'Expiry Item',
          title: e.name,
          subtitle: `Category: ${e.category} | Expires: ${e.expiry_date}`,
          link: '/inventory',
          icon: Calendar,
        }));

        setResults(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <div className="page">
      <div className={styles.searchContainer}>
        <div className={styles.searchBar}>
          <SearchIcon size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search tasks, notes, vehicles, wardrobe..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        {loading && <div className={styles.loading}>Searching Operating System...</div>}

        {!loading && query && results.length === 0 && (
          <div className={styles.noResults}>No matches found in your database.</div>
        )}

        <div className={styles.resultsList}>
          {results.map(res => {
            const Icon = res.icon || HelpCircle;
            return (
              <a key={res.id + res.type} href={res.link} className={styles.resultItem}>
                <div className={styles.resultIconWrapper}>
                  <Icon size={20} className={styles.resultIcon} />
                </div>
                <div className={styles.resultDetails}>
                  <div className={styles.resultHeader}>
                    <span className={styles.resultTitle}>{res.title}</span>
                    <span className={styles.resultType}>{res.type}</span>
                  </div>
                  {res.subtitle && <span className={styles.resultSubtitle}>{res.subtitle}</span>}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
