import type { TaskPriority, TaskCategory } from './types';

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--accent-info)' },
  { value: 'medium', label: 'Medium', color: 'var(--accent-warning)' },
  { value: 'high', label: 'High', color: 'var(--accent-danger)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--accent-danger)' },
];

export const TASK_CATEGORIES: { value: TaskCategory; label: string; emoji: string }[] = [
  { value: 'personal', label: 'Personal', emoji: '👤' },
  { value: 'work', label: 'Work', emoji: '💼' },
  { value: 'business', label: 'Business', emoji: '🏢' },
  { value: 'vehicle', label: 'Vehicle', emoji: '🚗' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'shopping', label: 'Shopping', emoji: '🛒' },
];

export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
