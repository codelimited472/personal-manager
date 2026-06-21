'use client';

import TaskItem from './TaskItem';
import { ClipboardList } from 'lucide-react';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
}

export default function TaskList({ tasks, emptyMessage = 'No tasks yet' }: TaskListProps) {
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

  return (
    <div className="stagger-children">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
