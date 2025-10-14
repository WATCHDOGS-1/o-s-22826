-- Function to get daily minutes studied
CREATE OR REPLACE FUNCTION public.get_daily_minutes(p_user_id uuid, p_date date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(minutes_studied), 0)::integer
  FROM study_sessions
  WHERE user_id = p_user_id AND date = p_date;
$$;

-- Function to get minutes studied for a period
CREATE OR REPLACE FUNCTION public.get_period_minutes(p_user_id uuid, p_start_date date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(minutes_studied), 0)::integer
  FROM study_sessions
  WHERE user_id = p_user_id AND date >= p_start_date;
$$;