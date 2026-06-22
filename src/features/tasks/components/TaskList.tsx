'use client';

import TaskItem from './TaskItem';
import { ClipboardList } from 'lucide-react';
import { groupBy, capitalize } from '@/lib/utils';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
  onEditTask?: (task: Task) => void;
}

export default function TaskList({ tasks, emptyMessage = 'No tasks yet', onEditTask }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <ClipboardList className="empty-state-icon" />
        <h3 className="empty-state-title">{emptyMessage}</h3>
        <p className="empty-state-description">
          Tap the + button to create your first task
        </p>
      </div>
    );
  }

  const groupedTasks = groupBy(tasks, 'category');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {Object.entries(groupedTasks).map(([category, catTasks]) => (
        <div key={category}>
          <h4 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: 'var(--text-secondary)', 
            marginBottom: 'var(--space-3)', 
            textTransform: 'capitalize',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.5 }}></span>
            {category} Tasks
          </h4>
          <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {catTasks.map(task => (
              <TaskItem key={task.id} task={task} onEdit={() => onEditTask?.(task)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
