-- Add username column to users table and make it unique
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Update RLS policies to allow username checks
CREATE POLICY "Anyone can check username availability" 
ON public.users 
FOR SELECT 
USING (true);