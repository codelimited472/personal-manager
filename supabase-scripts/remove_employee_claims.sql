-- ============================================================
-- Migration: Remove Employee Claims and Profiles
-- ============================================================
-- Execute this script in your Supabase project's SQL Editor
-- to drop employee claim tables from the database.

DROP TABLE IF EXISTS public.employee_expenses CASCADE;
DROP TABLE IF EXISTS public.employee_profiles CASCADE;

