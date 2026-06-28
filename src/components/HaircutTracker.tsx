'use client';

import { useState, useEffect } from 'react';
import { Scissors, Plus, Trash2 } from 'lucide-react';
import { getDB, type LocalHaircut } from '@/lib/db';
import { getToday } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { deleteRecord } from '@/lib/sync';
import styles from './HaircutTracker.module.css';

export default function HaircutTracker() {
  const db = getDB();
  const [haircuts, setHaircuts] = useState<LocalHaircut[]>([]);
  const [date, setDate] = useState(getToday());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadHaircuts() {
      const list = await db.haircuts.toArray();
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHaircuts(list);
    }
    loadHaircuts();
  }, [refreshKey]);

  const addHaircut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !cost) return;

    const parsedCost = parseFloat(cost);
    if (isNaN(parsedCost)) return;

    const newHaircut: LocalHaircut = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      date,
      description: description.trim(),
      location: location.trim(),
      cost: parsedCost,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    };

    await db.haircuts.add(newHaircut);

    // Also add to expenses
    await db.expenses.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      amount: parsedCost,
      category: 'Personal Care',
      description: `Haircut - ${description.trim()} at ${location.trim()}`,
      date: date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setDate(getToday());
    setDescription('');
    setLocation('');
    setCost('');
    setRefreshKey(k => k + 1);
  };

  const deleteHaircut = async (haircut: LocalHaircut) => {
    if (!(await window.appConfirm('Are you sure you want to delete this haircut?'))) return;

    // Find the corresponding expense
    const matchingExpense = await db.expenses
      .where('date').equals(haircut.date)
      .filter(e => e.amount === haircut.cost && e.category === 'Personal Care')
      .first();

    if (matchingExpense) {
      await deleteRecord('expenses', matchingExpense.id);
    }

    await deleteRecord('haircuts', haircut.id);
    setRefreshKey(k => k + 1);
  };

  const latestHaircut = haircuts.length > 0 ? haircuts[0] : null;
  const daysSince = latestHaircut 
    ? differenceInDays(new Date(getToday()), new Date(latestHaircut.date))
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Scissors size={20} color="var(--accent-primary)" /> Haircut Tracker
        </h3>
      </div>

      <div className={styles.statusCard}>
        {latestHaircut ? (
          <>
            <div className={styles.daysCount}>{daysSince}</div>
            <div className={styles.daysLabel}>
              {daysSince === 1 ? 'Day' : 'Days'} since last haircut
            </div>
            <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Last: {latestHaircut.date} at {latestHaircut.location || 'Unknown'}
            </div>
          </>
        ) : (
          <div className={styles.daysLabel}>No haircuts logged yet</div>
        )}
      </div>

      <h4 className={styles.formTitle}>Log a New Haircut</h4>
      <form onSubmit={addHaircut}>
        <div className={styles.formRow}>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup} style={{ flex: 1 }}>
            <input
              type="number"
              placeholder="Cost (₹)"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={styles.input}
              required
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Style/Description (e.g. Fade with trim)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Location/Salon name"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={styles.input}
          />
        </div>
        <button type="submit" className={styles.submitBtn}>
          <Plus size={16} /> Log Haircut
        </button>
      </form>

      {haircuts.length > 0 && (
        <div className={styles.historyList}>
          <h4 className={styles.formTitle} style={{ marginTop: 'var(--space-2)' }}>Haircut History</h4>
          {haircuts.map((h) => (
            <div key={h.id} className={styles.historyItem}>
              <div className={styles.historyDetails}>
                <span className={styles.historyDate}>{h.date}</span>
                <span className={styles.historyLocDesc}>
                  {h.description || 'Haircut'} {h.location ? `at ${h.location}` : ''}
                </span>
              </div>
              <div className={styles.historyRight}>
                <span className={styles.historyCost}>
                  ₹{h.cost}
                </span>
                <button 
                  onClick={() => deleteHaircut(h)}
                  className={styles.deleteBtn}
                  title="Delete Haircut"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
