-- Add session_start column to study_sessions table to track when user actually started studying
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS session_start timestamp with time zone DEFAULT now();

-- Create index for better performance when querying active sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_start ON study_sessions(user_id, session_start);