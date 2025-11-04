-- Update trigger to handle Google OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Determine base username from various sources
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',           -- From signup form
    NEW.raw_user_meta_data->>'full_name',          -- From Google OAuth
    NEW.raw_user_meta_data->>'name',               -- Alternative OAuth field
    split_part(NEW.email, '@', 1)                   -- Fallback to email prefix
  );
  
  -- Remove spaces and special characters
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  final_username := base_username;
  
  -- Try to insert with base username, if conflict add numbers
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, final_username);
      EXIT; -- Success, exit loop
    EXCEPTION 
      WHEN unique_violation THEN
        counter := counter + 1;
        final_username := base_username || counter::text;
        IF counter > 100 THEN
          -- Fallback to UUID suffix after 100 attempts
          final_username := base_username || '_' || substr(md5(random()::text), 1, 6);
          INSERT INTO public.profiles (id, username)
          VALUES (NEW.id, final_username);
          EXIT;
        END IF;
    END;
  END LOOP;
  
  -- Create user stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;