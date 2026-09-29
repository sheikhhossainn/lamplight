-- Fix Supabase Security Advisor Critical warnings:
-- Views in the public schema without security_invoker = true execute queries
-- as the view owner (SECURITY DEFINER), bypassing RLS on underlying tables.

alter view public.feedback_summary set (security_invoker = true);
alter view public.book_ratings_summary set (security_invoker = true);
