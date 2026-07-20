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
import { ChevronLeft, ChevronRight, Gift, Heart, Bell, Calendar as CalendarIcon, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import styles from '@/app/events/events.module.css';

interface EventsWidgetProps {
  refreshKey?: number;
  readOnly?: boolean;
  onDelete?: (id: string) => void;
}

export default function EventsWidget({ refreshKey = 0, readOnly = false, onDelete }: EventsWidgetProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [filterType, setFilterType] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpcoming, setShowUpcoming] = useState(true);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      if (!user) return;
      const db = getDB();
      const allEvents = await db.events.toArray();
      
      const vehicles = await db.vehicles.toArray();
      vehicles.forEach(v => {
        if (v.insurance_expiry) {
          allEvents.push({
            id: `veh-${v.id}-ins`,
            user_id: user.id,
            title: `${v.name} Insurance Expiry`,
            date: v.insurance_expiry,
            type: 'reminder',
            notes: `Insurance expires on ${v.insurance_expiry}`,
            created_at: v.created_at,
            updated_at: v.updated_at,
            _syncStatus: 'pending'
          });
        }
        if (v.pollution_expiry) {
          allEvents.push({
            id: `veh-${v.id}-pol`,
            user_id: user.id,
            title: `${v.name} Pollution Expiry`,
            date: v.pollution_expiry,
            type: 'reminder',
            notes: `Pollution expires on ${v.pollution_expiry}`,
            created_at: v.created_at,
            updated_at: v.updated_at,
            _syncStatus: 'pending'
          });
        }
        if (v.road_tax_expiry) {
          allEvents.push({
            id: `veh-${v.id}-tax`,
            user_id: user.id,
            title: `${v.name} Road Tax Expiry`,
            date: v.road_tax_expiry,
            type: 'reminder',
            notes: `Road tax expires on ${v.road_tax_expiry}`,
            created_at: v.created_at,
            updated_at: v.updated_at,
            _syncStatus: 'pending'
          });
        }
      });

      const tasks = await db.tasks.toArray();
      tasks.forEach(t => {
        if (t.due_date && t.status !== 'completed') {
          allEvents.push({
            id: `task-${t.id}`,
            user_id: t.user_id,
            title: `Task: ${t.title}`,
            date: t.due_date,
            type: 'reminder',
            notes: t.description || `Priority: ${t.priority}`,
            created_at: t.created_at,
            updated_at: t.updated_at,
            _syncStatus: 'pending'
          });
        }
      });
  
      setEvents(allEvents);
    }
    loadEvents();
  }, [user, refreshKey]);

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
        if (e.id.startsWith('veh-') || e.id.startsWith('task-')) {
          return isSameDay(originalDate, day);
        }
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
      const eventDateObj = parseISO(e.date);
      let nextOccurrence;
      let yearsSince = 0;

      if (e.id.startsWith('veh-') || e.id.startsWith('task-')) {
        nextOccurrence = eventDateObj;
      } else {
        nextOccurrence = setYear(eventDateObj, currentYear);
        if (isBefore(nextOccurrence, today)) {
          nextOccurrence = setYear(eventDateObj, currentYear + 1);
        }
        
        if (e.original_date) {
            yearsSince = differenceInYears(nextOccurrence, parseISO(e.original_date));
        } else if (eventDateObj.getFullYear() < currentYear - 1) {
            yearsSince = differenceInYears(nextOccurrence, eventDateObj);
        } else {
            yearsSince = 0;
        }
      }
      
      return {
        ...e,
        nextOccurrence,
        yearsSince
      };
    }).filter(e => !(e.id.startsWith('veh-') || e.id.startsWith('task-')) || !isBefore(e.nextOccurrence, today));
    
    // Sort by next occurrence date
    return upcoming.sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
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
    <div>
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

      {/* Selected Day Events */}
      {getEventsForDay(selectedDate).length > 0 && (
        <>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '20px 0 15px 0', color: 'var(--text-primary)' }}>
            Events on {format(selectedDate, 'MMM do, yyyy')}
          </h3>
          <div className={styles.eventList} style={{ marginBottom: '20px' }}>
            {getEventsForDay(selectedDate).map((event) => {
              let ageText = '';
              if (!event.id.startsWith('veh-') && !event.id.startsWith('task-')) {
                const yearsSince = differenceInYears(selectedDate, parseISO(event.date));
                if (event.type === 'birthday' && yearsSince > 0) ageText = `Turns ${yearsSince}`;
                if (event.type === 'anniversary' && yearsSince > 0) ageText = `${yearsSince} Years`;
              }

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
                      <span className={styles.eventDate}>{event.notes || format(parseISO(event.date), 'MMM do, yyyy')}</span>
                      {ageText && <span className={styles.eventAge}>{ageText}</span>}
                    </div>
                  </div>

                  {!readOnly && onDelete && !event.id.startsWith('veh-') && !event.id.startsWith('task-') && (
                    <button className={styles.deleteBtn} onClick={() => onDelete(event.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Upcoming Events Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 15px 0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Upcoming Events
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setShowUpcoming(!showUpcoming)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-secondary)', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}
          >
            {showUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => { setFilterType('monthly'); setShowUpcoming(true); }}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: filterType === 'monthly' ? 'var(--accent-primary)' : 'transparent', color: filterType === 'monthly' ? 'white' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Monthly
            </button>
            <button 
              onClick={() => { setFilterType('yearly'); setShowUpcoming(true); }}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: filterType === 'yearly' ? 'var(--accent-primary)' : 'transparent', color: filterType === 'yearly' ? 'white' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>
      
      {showUpcoming && (
        <div className={styles.eventList}>
          {upcomingEvents.filter(e => filterType === 'yearly' || (isSameMonth(e.nextOccurrence, currentMonth) && e.nextOccurrence.getFullYear() === currentMonth.getFullYear())).length === 0 ? (
            <div className={styles.emptyState}>
              No events found for this filter.
            </div>
          ) : (
            upcomingEvents.filter(e => filterType === 'yearly' || (isSameMonth(e.nextOccurrence, currentMonth) && e.nextOccurrence.getFullYear() === currentMonth.getFullYear())).map((event) => {
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

                  {!readOnly && onDelete && !event.id.startsWith('veh-') && !event.id.startsWith('task-') && (
                    <button className={styles.deleteBtn} onClick={() => onDelete(event.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
