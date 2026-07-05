'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getDB, type LocalEvent } from '@/lib/db';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  getDay,
  differenceInYears,
  setYear,
  isBefore,
  startOfDay,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Gift, Heart, Bell, Calendar as CalendarIcon, Trash2, X } from 'lucide-react';
import styles from './events.module.css';

export default function EventsPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'birthday' | 'anniversary' | 'reminder' | 'other'>('birthday');
  const [notes, setNotes] = useState('');

  // Load events
  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;
    const db = getDB();
    const allEvents = await db.events.toArray();
    setEvents(allEvents);
  };

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = monthStart;
  const days = eachDayOfInterval({ start: startDate, end: monthEnd });
  
  // Pad beginning of month with empty days
  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Determine if a specific calendar day has an event this year
  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      try {
        const originalDate = parseISO(e.date);
        // Events happen every year on the same month and day
        return originalDate.getMonth() === day.getMonth() && originalDate.getDate() === day.getDate();
      } catch (err) {
        return false;
      }
    });
  };

  // Calculate upcoming events in chronological order
  const getUpcomingEvents = () => {
    const today = startOfDay(new Date());
    const currentYear = today.getFullYear();
    
    const upcoming = events.map(e => {
      const originalDate = parseISO(e.date);
      let nextOccurrence = setYear(originalDate, currentYear);
      
      // If it has already passed this year, the next occurrence is next year
      if (isBefore(nextOccurrence, today)) {
        nextOccurrence = setYear(originalDate, currentYear + 1);
      }
      
      const yearsSince = differenceInYears(nextOccurrence, originalDate);
      
      return {
        ...e,
        nextOccurrence,
        yearsSince
      };
    });
    
    // Sort by next occurrence date
    return upcoming.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !date) return;

    const db = getDB();
    await db.events.add({
      id: crypto.randomUUID(),
      user_id: user.id,
      title,
      date,
      type,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _syncStatus: 'pending'
    });

    // Reset form
    setTitle('');
    setDate('');
    setType('birthday');
    setNotes('');
    setShowAddForm(false);
    
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const db = getDB();
    
    // Instead of deleting directly, queue for sync deletion in a full app
    // Here we'll delete locally and queue in local storage if you have that setup
    // Since this is a simple implementation, we'll just delete locally. In a full offline app, you'd use deleteRecord from sync.ts
    await db.events.delete(id);
    loadEvents();
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Gift size={20} />;
      case 'anniversary': return <Heart size={20} />;
      case 'reminder': return <Bell size={20} />;
      default: return <CalendarIcon size={20} />;
    }
  };

  const upcomingEvents = getUpcomingEvents();

  return (
    <div className="page" style={{ padding: '20px', overflowY: 'auto', paddingBottom: '100px' }}>
      
      {/* Calendar Section */}
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={18} /></button>
          <span className={styles.calendarTitle}>{format(currentMonth, 'MMMM yyyy')}</span>
          <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
        
        <div className={styles.weekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        
        <div className={styles.daysGrid}>
          {paddingDays.map(idx => (
            <div key={`empty-${idx}`} className={`${styles.dayCell} ${styles.emptyDay}`} />
          ))}
          
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            
            return (
              <div 
                key={day.toString()}
                className={`
                  ${styles.dayCell} 
                  ${!isSameMonth(day, currentMonth) ? styles.differentMonth : ''}
                  ${isToday(day) ? styles.todayCell : ''}
                  ${isSelected ? styles.activeDay : ''}
                `}
                onClick={() => setSelectedDate(day)}
              >
                <span>{format(day, 'd')}</span>
                
                {dayEvents.length > 0 && (
                  <div className={styles.eventDots}>
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <div 
                        key={idx} 
                        className={`
                          ${styles.dot} 
                          ${e.type === 'birthday' ? styles.dotBirthday : ''}
                          ${e.type === 'anniversary' ? styles.dotAnniversary : ''}
                          ${e.type === 'reminder' ? styles.dotReminder : ''}
                          ${e.type === 'other' ? styles.dotOther : ''}
                        `} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day / Upcoming Events Section */}
      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '20px 0 15px 0', color: 'var(--text-primary)' }}>
        Upcoming Events
      </h3>
      
      <div className={styles.eventList}>
        {upcomingEvents.length === 0 ? (
          <div className={styles.emptyState}>
            No events added yet. Tap the + button to add birthdays and anniversaries.
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const daysUntil = Math.ceil((event.nextOccurrence.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            let subtitle = format(event.nextOccurrence, 'MMM do, yyyy');
            if (daysUntil === 0) subtitle = 'Today!';
            else if (daysUntil === 1) subtitle = 'Tomorrow';
            else if (daysUntil <= 7) subtitle = `In ${daysUntil} days`;

            let ageText = '';
            if (event.type === 'birthday' && event.yearsSince > 0) ageText = `Turns ${event.yearsSince}`;
            if (event.type === 'anniversary' && event.yearsSince > 0) ageText = `${event.yearsSince} Years`;

            return (
              <div key={event.id} className={styles.eventCard}>
                <div className={`
                  ${styles.eventIcon} 
                  ${event.type === 'birthday' ? styles.iconBirthday : ''}
                  ${event.type === 'anniversary' ? styles.iconAnniversary : ''}
                  ${event.type === 'reminder' ? styles.iconReminder : ''}
                  ${event.type === 'other' ? styles.iconOther : ''}
                `}>
                  {renderIcon(event.type)}
                </div>
                
                <div className={styles.eventInfo}>
                  <div className={styles.eventTitle}>{event.title}</div>
                  <div className={styles.eventMeta}>
                    <span className={styles.eventDate}>{subtitle}</span>
                    {ageText && <span className={styles.eventAge}>{ageText}</span>}
                  </div>
                </div>

                <button className={styles.deleteBtn} onClick={() => handleDelete(event.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Button */}
      <div className={styles.fabWrapper} style={{ position: 'fixed', bottom: '80px', right: 0, left: 0, maxWidth: 'var(--max-width, 480px)', margin: '0 auto', pointerEvents: 'none', zIndex: 50 }}>
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
            borderTopLeftRadius: '24px', 
            borderTopRightRadius: '24px', 
            padding: '24px', 
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
                <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="reminder">Annual Reminder</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Original Date (Year matters for age)</label>
                <input 
                  type="date" 
                  required 
                  className={styles.input} 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

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
