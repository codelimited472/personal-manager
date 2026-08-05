'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDB } from '@/lib/db';
import { deleteRecord } from '@/lib/sync';
import { Plus, X } from 'lucide-react';
import styles from './events.module.css';
import EventsWidget from '@/components/EventsWidget';

export default function EventsPage() {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [type, setType] = useState<'birthday' | 'anniversary' | 'reminder' | 'other'>('birthday');
  const [notes, setNotes] = useState('');

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !date) return;

    const db = getDB();
    await db.events.add({
      id: crypto.randomUUID(),
      user_id: user.id,
      title,
      date,
      original_date: (type === 'birthday' || type === 'anniversary') && originalDate ? originalDate : undefined,
      type,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });

    // Reset form
    setTitle('');
    setDate('');
    setOriginalDate('');
    setType('birthday');
    setNotes('');
    setShowAddForm(false);
    
    setRefreshKey(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    await deleteRecord('events', id);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page" style={{ padding: '20px', overflowY: 'auto', paddingBottom: '100px' }}>
      
      <EventsWidget 
        refreshKey={refreshKey} 
        onDelete={handleDelete} 
      />

      {/* Floating Add Button */}
      <div className={styles.fabWrapper} style={{ position: 'fixed', bottom: '110px', right: 0, left: 0, maxWidth: 'var(--max-width, 480px)', margin: '0 auto', pointerEvents: 'none', zIndex: 50 }}>
        <button className={styles.addBtn} onClick={() => setShowAddForm(true)} style={{ position: 'absolute', right: '20px', bottom: 0, pointerEvents: 'auto' }}>
          <Plus size={24} />
        </button>
      </div>

      {/* Add Event Modal */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAddForm(false)} />
          
          <div style={{ 
            background: 'var(--bg-primary)', 
            width: '100%', 
            maxWidth: '480px', 
            maxHeight: '90vh',
            overflowY: 'auto',
            borderTopLeftRadius: '24px', 
            borderTopRightRadius: '24px', 
            padding: '24px', 
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)',
            position: 'relative', 
            zIndex: 101,
            animation: 'slideUp 0.3s ease-out forwards'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Add Event</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'var(--bg-secondary)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEvent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Event Title</label>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  placeholder="e.g. Mom's Birthday" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Event Type</label>
                <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as 'birthday' | 'anniversary' | 'reminder' | 'other')}>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="reminder">Annual Reminder</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Event Date (Month and day matter)</label>
                <input 
                  type="date" 
                  required 
                  className={styles.input} 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {(type === 'birthday' || type === 'anniversary') && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Original Date (Optional, for age/years)</label>
                  <input 
                    type="date" 
                    className={styles.input} 
                    value={originalDate}
                    onChange={(e) => setOriginalDate(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Notes (Optional)</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="Gift ideas, preferences..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                Save Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
