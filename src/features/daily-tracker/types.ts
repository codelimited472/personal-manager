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

export const ACTIVITY_CATEGORIES: string[] = [];

export const ACTIVITY_COLORS = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#64748b', name: 'Slate' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#84cc16', name: 'Lime' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#d946ef', name: 'Fuchsia' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#be123c', name: 'Rose' },
  { hex: '#78716c', name: 'Stone' },
  { hex: '#475569', name: 'Blue Gray' },
];
