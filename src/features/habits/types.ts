export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  target_days?: string[];
  category?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  notes?: string;
  created_at: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface HabitFormData {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  target_days?: string[];
  category?: string;
  color: string;
}

export interface HabitWithStatus extends Habit {
  completedToday: boolean;
  streak: number;
}
