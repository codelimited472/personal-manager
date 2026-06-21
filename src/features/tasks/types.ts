export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  is_recurring: boolean;
  recurrence_rule?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'personal' | 'work' | 'business' | 'vehicle' | 'travel' | 'shopping';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskFormData {
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  category: TaskCategory;
  is_recurring: boolean;
  recurrence_rule?: string;
}
