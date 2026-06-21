'use client';

import { Check, Trash2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toggleTask, deleteTask } from '../services/taskService';
import { formatRelativeDate, cn, getToday } from '@/lib/utils';
import type { Task } from '../types';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && !!task.due_date && task.due_date < getToday();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    await toggleTask(task.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTask(task.id);
  };

  return (
    <div
      className={cn(styles.item, isCompleted && styles.itemCompleted)}
      id={`task-${task.id}`}
    >
      {/* Checkbox */}
      <button
        className={cn(styles.checkbox, isCompleted && styles.checkboxChecked)}
        onClick={handleToggle}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted && <Check size={14} strokeWidth={3} color="white" />}
      </button>

      {/* Content */}
      <div className={styles.content}>
        <span className={cn(styles.title, isCompleted && styles.titleCompleted)}>
          {task.title}
        </span>
        <div className={styles.meta}>
          {task.due_date && (
            <span className={cn(styles.metaItem, isOverdue && styles.metaDanger)}>
              <Clock size={11} />
              {isOverdue ? 'Overdue' : formatRelativeDate(task.due_date)}
            </span>
          )}
          <span
            className={`badge badge-${
              task.priority === 'urgent' || task.priority === 'high' ? 'danger' :
              task.priority === 'medium' ? 'warning' : 'info'
            }`}
          >
            {task.priority}
          </span>
          <span className="badge badge-neutral">
            {task.category}
          </span>
        </div>
      </div>

      {/* Delete */}
      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        aria-label="Delete task"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
