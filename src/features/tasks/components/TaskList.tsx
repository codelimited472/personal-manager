'use client';

import { useState } from 'react';
import TaskItem from './TaskItem';
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import { groupBy } from '@/lib/utils';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
  onEditTask?: (task: Task) => void;
}

export default function TaskList({ tasks, emptyMessage = 'No tasks yet', onEditTask }: TaskListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };
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
      {Object.entries(groupedTasks).map(([category, catTasks]) => {
        const isCollapsed = collapsedCategories[category];
        return (
        <div key={category}>
          <h4 
            onClick={() => toggleCategory(category)}
            style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--space-3)', 
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.5 }}></span>
            {category} Tasks
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </h4>
          {!isCollapsed && (
            <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {catTasks.map(task => (
                <TaskItem key={task.id} task={task} onEdit={() => onEditTask?.(task)} />
              ))}
            </div>
          )}
        </div>
      )})}
    </div>
  );
}
