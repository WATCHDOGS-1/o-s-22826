-- Drop old functions with CASCADE
DROP FUNCTION IF EXISTS public.get_daily_minutes(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_period_minutes(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_study_stats() CASCADE;

-- Recreate functions with TEXT user_id
CREATE OR REPLACE FUNCTION public.get_daily_minutes(p_user_id TEXT, p_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(minutes_studied), 0)::integer
  FROM study_sessions
  WHERE user_id = p_user_id AND date = p_date;
$$;

CREATE OR REPLACE FUNCTION public.get_period_minutes(p_user_id TEXT, p_start_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(minutes_studied), 0)::integer
  FROM study_sessions
  WHERE user_id = p_user_id AND date >= p_start_date;
$$;