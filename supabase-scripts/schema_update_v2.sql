-- Schema Update V2: Sync refactoring and cleanup

-- 1. ADD WORKSPACE_ID TO TASKS
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.business_workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);

-- 2. CREATE MISSING BUSINESS TABLES

-- A. Business Links
CREATE TABLE IF NOT EXISTS public.business_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.business_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own business links" ON public.business_links FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own business links" ON public.business_links FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own business links" ON public.business_links FOR UPDATE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own business links" ON public.business_links FOR DELETE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_business_links_workspace_id ON public.business_links(workspace_id);

-- B. Business Timeline Events
CREATE TABLE IF NOT EXISTS public.business_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.business_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own business timeline events" ON public.business_timeline_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own business timeline events" ON public.business_timeline_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own business timeline events" ON public.business_timeline_events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own business timeline events" ON public.business_timeline_events FOR DELETE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_business_timeline_events_workspace_id ON public.business_timeline_events(workspace_id);

-- C. Business Checklist Items
CREATE TABLE IF NOT EXISTS public.business_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
    group_name TEXT,
    content TEXT NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.business_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own business checklist items" ON public.business_checklist_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own business checklist items" ON public.business_checklist_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can update their own business checklist items" ON public.business_checklist_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own business checklist items" ON public.business_checklist_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.business_workspaces WHERE id = workspace_id AND user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_business_checklist_items_workspace_id ON public.business_checklist_items(workspace_id);

-- 3. DROP UNUSED TABLES
-- Make sure to back up data if you had any test data here!
DROP TABLE IF EXISTS public.business_tasks CASCADE;
DROP TABLE IF EXISTS public.buy_items CASCADE;
DROP TABLE IF EXISTS public.lists CASCADE;
DROP TABLE IF EXISTS public.list_items CASCADE;
