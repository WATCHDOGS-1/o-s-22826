-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  room_id TEXT NOT NULL,
  minutes_studied INTEGER NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (all can read, users can update their own)
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own record" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own record" ON public.users FOR UPDATE USING (true);

-- RLS Policies for user_stats (all can read for leaderboard)
CREATE POLICY "User stats are viewable by everyone" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "User stats can be inserted" ON public.user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "User stats can be updated" ON public.user_stats FOR UPDATE USING (true);

-- RLS Policies for study_sessions (all can read for leaderboard)
CREATE POLICY "Study sessions are viewable by everyone" ON public.study_sessions FOR SELECT USING (true);
CREATE POLICY "Study sessions can be inserted" ON public.study_sessions FOR INSERT WITH CHECK (true);

-- Trigger to automatically create user_stats when user is created
CREATE OR REPLACE FUNCTION create_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats();

-- Trigger to update user_stats when study session is added
CREATE OR REPLACE FUNCTION update_user_study_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_stats
  SET 
    total_minutes = total_minutes + NEW.minutes_studied,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_study_session_created
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_study_stats();