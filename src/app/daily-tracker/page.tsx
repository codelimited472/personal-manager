'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { useDailyTracker } from '@/features/daily-tracker/hooks/useDailyTracker';
import { Timetable } from '@/features/daily-tracker/components/Timetable';
import { ActivityModal } from '@/features/daily-tracker/components/ActivityModal';
import { DailyActivity } from '@/features/daily-tracker/types';
import { Plus } from 'lucide-react';
import { getToday, addDays, format } from '@/lib/utils';
import styles from './daily-tracker.module.css';

export default function DailyTrackerPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState<string>(getToday());
  const [dateStrip, setDateStrip] = useState<{ dateStr: string; displayDay: string; displayNum: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate 15 days (7 days before, today, 7 days after)
  useEffect(() => {
    const today = new Date();
    const strip = [];
    for (let i = -7; i <= 7; i++) {
      const d = addDays(today, i);
      strip.push({
        dateStr: format(d, 'yyyy-MM-dd'),
        displayDay: format(d, 'EEE'),
        displayNum: format(d, 'd'),
      });
    }
    setDateStrip(strip);
    
    // Scroll to center (today)
    setTimeout(() => {
      if (scrollRef.current) {
        const center = scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2;
        scrollRef.current.scrollTo({ left: center, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  const {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    isLoading
  } = useDailyTracker(user?.id, currentDate);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialData?: Partial<DailyActivity>;
    selectedTime?: string;
  }>({ isOpen: false });

  return (
    <div className={styles.pageContainer}>
      <Header title="Daily Tracker" />
      
      <main className={styles.mainContent}>
        {/* Calendar Strip (Mobile First) */}
        <div className={styles.calendarStrip} ref={scrollRef}>
          {dateStrip.map(day => (
            <div 
              key={day.dateStr}
              className={`${styles.calendarDay} ${currentDate === day.dateStr ? styles.calendarDayActive : ''}`}
              onClick={() => setCurrentDate(day.dateStr)}
            >
              <span className={styles.calendarDayName}>{day.displayDay}</span>
              <span className={styles.calendarDayNum}>{day.displayNum}</span>
            </div>
          ))}
        </div>

        <div className={styles.workspace}>
          {/* Main Timetable Area */}
          <div className={styles.timetableSection}>
            <Timetable 
              activities={activities || []} 
              onActivityClick={(activity) => setModalState({ isOpen: true, initialData: activity })}
              onTimeSlotClick={(time) => setModalState({ isOpen: true, selectedTime: time })}
            />
          </div>
        </div>

        {/* Floating Action Button */}
        <div className={styles.fabWrapper}>
          <button
            className={styles.fabBtn}
            onClick={() => setModalState({ isOpen: true })}
            title="Add Activity"
          >
            <Plus size={24} />
          </button>
        </div>
      </main>

      <BottomNav />

      <ActivityModal
        isOpen={modalState.isOpen}
        initialData={modalState.initialData}
        selectedTime={modalState.selectedTime}
        onClose={() => setModalState({ isOpen: false })}
        onSave={(data) => {
          if (modalState.initialData?.id) {
            updateActivity(modalState.initialData.id, data);
          } else {
            addActivity(data);
          }
        }}
        onDelete={deleteActivity}
      />
    </div>
  );
}
