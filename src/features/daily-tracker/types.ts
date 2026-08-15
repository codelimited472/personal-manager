export interface DailyActivity {
  id: string;
  user_id: string;
  date: string;
  start_time: string; // 'HH:mm'
  end_time: string;   // 'HH:mm'
  title: string;
  category: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyActivityFormData {
  start_time: string;
  end_time: string;
  title: string;
  category: string;
  color: string;
  description?: string;
}

export const ACTIVITY_CATEGORIES = [
  'Sleep',
  'Work',
  'Travel',
  'Exercise',
  'Food',
  'Leisure',
  'Learning',
  'Chores',
  'Other'
];

export const ACTIVITY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#ef4444', // red
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#64748b', // slate
];
