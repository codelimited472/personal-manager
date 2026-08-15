import React, { useState, useEffect, useRef } from 'react';
import { DailyActivity } from '../types';
import styles from './Timetable.module.css';

interface TimetableProps {
  activities: DailyActivity[];
  onActivityClick: (activity: DailyActivity) => void;
  onTimeSlotClick: (time: string) => void;
}

export function Timetable({ activities, onActivityClick, onTimeSlotClick }: TimetableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Generate 48 half-hours for clickable slots
  const halfHours = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const pixelsPerHour = 80;
  const pixelsPerMinute = pixelsPerHour / 60;

  // Helper to convert HH:mm to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to position activity block
  const getActivityStyle = (activity: DailyActivity) => {
    const startMins = timeToMinutes(activity.start_time);
    const endMins = timeToMinutes(activity.end_time);
    
    // Handle wrap around (e.g. 23:00 to 02:00)
    let durationMins = endMins - startMins;
    if (durationMins < 0) durationMins += 24 * 60; // next day

    const top = startMins * pixelsPerMinute;
    const height = durationMins * pixelsPerMinute;

    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: activity.color,
    };
  };

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      // Center the current time
      containerRef.current.scrollTop = Math.max(0, (currentMins * pixelsPerMinute) - containerRef.current.clientHeight / 2);
    }
  }, []);

  return (
    <div className={styles.timetableContainer} ref={containerRef}>
      <div className={styles.timetableGrid}>
        {/* Time labels */}
        <div className={styles.timeLabels}>
          {hours.map((hour) => (
            <div key={hour} className={styles.timeLabel}>
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className={styles.contentArea}>
          {/* Invisible clickable slots for each 30 mins */}
          {halfHours.map((time) => (
            <div 
              key={time} 
              className={styles.hourLine}
              onClick={() => onTimeSlotClick(time)}
            />
          ))}

          {/* Activity blocks */}
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={styles.activityBlock}
              style={getActivityStyle(activity)}
              onClick={(e) => {
                e.stopPropagation();
                onActivityClick(activity);
              }}
            >
              <div className={styles.activityTitle}>{activity.title}</div>
              <div className={styles.activityTime}>
                {activity.start_time} - {activity.end_time}
              </div>
            </div>
          ))}
          
          {/* Current time indicator */}
          <CurrentTimeIndicator pixelsPerMinute={pixelsPerMinute} />
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator({ pixelsPerMinute }: { pixelsPerMinute: number }) {
  const [top, setTop] = useState(() => {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTop((now.getHours() * 60 + now.getMinutes()) * pixelsPerMinute);
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [pixelsPerMinute]);

  return (
    <div className={styles.currentTimeLine} style={{ top: `${top}px` }}>
      <div className={styles.currentTimeDot} />
    </div>
  );
}
