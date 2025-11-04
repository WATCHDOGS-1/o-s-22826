-- Update study_sessions to use username (text instead of UUID)
ALTER TABLE public.study_sessions 
DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey,
ALTER COLUMN user_id TYPE TEXT;

-- Update user_stats to use username
ALTER TABLE public.user_stats
DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey,
ALTER COLUMN user_id TYPE TEXT;

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for chat messages
DROP POLICY IF EXISTS "Anyone can view messages" ON public.chat_messages;
CREATE POLICY "Anyone can view messages" 
ON public.chat_messages FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;
CREATE POLICY "Anyone can insert messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (true);

-- Create or replace function to update user stats
CREATE OR REPLACE FUNCTION public.update_user_study_stats(p_user_id TEXT, p_minutes INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_minutes, weekly_minutes, daily_minutes, last_study_date, week_start)
  VALUES (p_user_id, p_minutes, p_minutes, p_minutes, CURRENT_DATE, DATE_TRUNC('week', CURRENT_DATE)::DATE)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_minutes = user_stats.total_minutes + p_minutes,
    weekly_minutes = CASE 
      WHEN user_stats.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE 
      THEN user_stats.weekly_minutes + p_minutes
      ELSE p_minutes
    END,
    daily_minutes = CASE
      WHEN user_stats.last_study_date = CURRENT_DATE
      THEN user_stats.daily_minutes + p_minutes
      ELSE p_minutes
    END,
    last_study_date = CURRENT_DATE,
    week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE,
    updated_at = NOW();
END;
$$;

-- Enable realtime for chat
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;