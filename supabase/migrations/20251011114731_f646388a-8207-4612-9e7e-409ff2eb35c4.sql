-- Create users table for anonymous users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL, -- Random ID stored in localStorage
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Create study sessions table
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  minutes_studied integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Create user stats table
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  total_minutes integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_study_date date,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations since we're using anonymous users
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on study_sessions" ON public.study_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_stats" ON public.user_stats FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_date ON public.study_sessions(date);
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stats when session ends
CREATE TRIGGER on_study_session_insert
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();