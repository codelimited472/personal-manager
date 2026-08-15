-- Remove Habits feature tables
DROP TABLE IF EXISTS public.habit_logs CASCADE;
DROP TABLE IF EXISTS public.habits CASCADE;

-- Create Daily Tracker tables
CREATE TABLE public.daily_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily activities" ON public.daily_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily activities" ON public.daily_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily activities" ON public.daily_activities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily activities" ON public.daily_activities FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id ON public.daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON public.daily_activities(date);
