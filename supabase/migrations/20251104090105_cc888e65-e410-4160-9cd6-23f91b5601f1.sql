-- Update trigger function to use username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with username from metadata or fallback to email prefix
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  );
  
  -- Create user stats
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username already exists, append random suffix
    INSERT INTO public.profiles (id, username)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)) || '_' || substr(md5(random()::text), 1, 6)
    );
    RETURN NEW;
END;
$$;