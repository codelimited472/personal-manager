'use client';

import { Check, Trash2, Clock, ArrowRight, Edit2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toggleTask, deleteTask } from '../services/taskService';
import { formatRelativeDate, cn, getToday } from '@/lib/utils';
import type { Task } from '../types';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  task: Task;
  onEdit?: () => void;
}

export default function TaskItem({ task, onEdit }: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const isCarriedForward = task.status === 'carried_forward' as any;
  const isOverdue = !isCompleted && !!task.due_date && task.due_date < getToday();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCarriedForward) return; // Prevent completing from past, do it from today
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
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    e.stopPropagation();
    await deleteTask(task.id);
  };

  return (
    <div
      className={cn(styles.item, isCompleted && styles.itemCompleted, isCarriedForward && styles.itemCarried)}
      id={`task-${task.id}`}
    >
      {/* Checkbox */}
      <button
        className={cn(styles.checkbox, isCompleted && styles.checkboxChecked, isCarriedForward && styles.checkboxCarried)}
        onClick={handleToggle}
        aria-label={isCarriedForward ? 'Task carried forward to next day' : (isCompleted ? 'Mark as incomplete' : 'Mark as complete')}
        disabled={isCarriedForward}
      >
        {isCompleted && <Check size={14} strokeWidth={3} color="white" />}
        {isCarriedForward && <ArrowRight size={14} strokeWidth={2.5} className={styles.iconCarried} />}
      </button>

      {/* Content */}
      <div className={styles.content}>
        <span className={cn(styles.title, isCompleted && styles.titleCompleted, isCarriedForward && styles.titleCarried)}>
          {task.title}
        </span>
        <div className={styles.meta}>
          {task.due_date && (
            <span className={cn(styles.metaItem, isOverdue && !isCarriedForward && styles.metaDanger)}>
              <Clock size={11} />
              {isOverdue && !isCarriedForward ? 'Overdue' : formatRelativeDate(task.due_date)}
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

      {/* Actions */}
      <div className={styles.actions}>
        {onEdit && (
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit task"
          >
            <Edit2 size={16} />
          </button>
        )}
        <button
          className={styles.actionBtn}
          onClick={handleDelete}
          aria-label="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
