-- Fix search_path for update_user_stats function
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;

CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_minutes, last_study_date)
  VALUES (NEW.user_id, NEW.minutes_studied, NEW.date)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_minutes = user_stats.total_minutes + NEW.minutes_studied,
    last_study_date = NEW.date,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_study_session_insert
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();