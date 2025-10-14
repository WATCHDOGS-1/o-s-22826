-- Trigger type regeneration by adding a comment to users table
COMMENT ON TABLE public.users IS 'Stores user information for the study app';
COMMENT ON TABLE public.study_sessions IS 'Tracks individual study sessions';
COMMENT ON TABLE public.user_stats IS 'Aggregated statistics for each user';