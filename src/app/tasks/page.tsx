'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import TaskList from '@/features/tasks/components/TaskList';
import TaskForm from '@/features/tasks/components/TaskForm';
import { Plus, Calendar as CalendarIcon, Clock, Eye, EyeOff } from 'lucide-react';
import { getToday, addDays, format } from '@/lib/utils';
import styles from './tasks.module.css';

function TasksContent() {
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [dateStrip, setDateStrip] = useState<{ dateStr: string; displayDay: string; displayNum: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);

  const { tasks, todayTasks, upcomingTasks, stats } = useTasks({ date: selectedDate });

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

  // Open form if redirected from Quick Add
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowForm(true);
      setEditingTask(null);
    }
  }, [searchParams]);

  const handleOpenForm = (task?: any) => {
    setEditingTask(task || null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingTask(null);
    setShowForm(false);
  };

  let displayTasks = selectedDate === getToday() ? todayTasks : tasks;

  if (hideCompletedTasks) {
    displayTasks = displayTasks.filter(t => t.status !== 'completed');
  }

  // Sort displayTasks: non-completed first, completed at the bottom
  displayTasks = [...displayTasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    return 0;
  });

  return (
    <div className="page">
      {/* Calendar Strip */}
      <div className={styles.calendarStrip} ref={scrollRef}>
        {dateStrip.map(day => (
          <div 
            key={day.dateStr}
            className={`${styles.calendarDay} ${selectedDate === day.dateStr ? styles.calendarDayActive : ''}`}
            onClick={() => setSelectedDate(day.dateStr)}
          >
            <span className={styles.calendarDayName}>{day.displayDay}</span>
            <span className={styles.calendarDayNum}>{day.displayNum}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.pending}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.completed}</span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statValue} ${stats.overdue > 0 ? styles.statDanger : ''}`}>
            {stats.overdue}
          </span>
          <span className={styles.statLabel}>Overdue</span>
        </div>
      </div>

      <div className={styles.sectionHeader} style={{ marginTop: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className={styles.sectionTitle}>
          <CalendarIcon className={styles.sectionIcon} size={20} /> 
          Tasks for {selectedDate === getToday() ? 'Today' : selectedDate}
        </h3>
        <button 
          onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
          title={hideCompletedTasks ? "Show Completed Tasks" : "Hide Completed Tasks"}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-secondary)', 
            borderRadius: 'var(--radius-full)', 
            padding: '6px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          {hideCompletedTasks ? <EyeOff size={14} /> : <Eye size={14} />}
          {hideCompletedTasks ? 'Show' : 'Hide'}
        </button>
      </div>

      {/* Add Button */}
      {selectedDate >= getToday() && (
        <button
          className={styles.addBtn}
          onClick={() => handleOpenForm()}
          id="add-task-btn"
          style={{ marginBottom: 'var(--space-4)' }}
        >
          <Plus size={20} />
          <span>Add Task</span>
        </button>
      )}

      {/* Task List */}
      <div className={styles.taskList} style={{ marginBottom: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
        <TaskList 
          tasks={displayTasks} 
          emptyMessage={`No tasks found for ${selectedDate === getToday() ? 'today' : selectedDate}`} 
          onEditTask={handleOpenForm}
        />
      </div>

      {/* Upcoming Tasks Section */}
      {selectedDate === getToday() && upcomingTasks && upcomingTasks.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Clock className={styles.sectionIcon} size={20} /> Upcoming Reminders
            </h3>
          </div>
          <div className={styles.taskList} style={{ marginTop: 'var(--space-2)' }}>
            <TaskList tasks={upcomingTasks} onEditTask={handleOpenForm} />
          </div>
        </>
      )}

      {/* Form Sheet */}
      {showForm && (
        <>
          <div className="modal-backdrop" onClick={handleCloseForm} />
          <TaskForm onClose={handleCloseForm} initialData={editingTask} />
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="page" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}
