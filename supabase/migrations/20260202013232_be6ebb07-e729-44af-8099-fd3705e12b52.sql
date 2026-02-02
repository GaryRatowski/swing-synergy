-- Allow user_id to be nullable for pending profiles
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Add status column with default 'active'
ALTER TABLE public.profiles 
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;

-- Update existing records to be active
UPDATE public.profiles SET status = 'active' WHERE user_id IS NOT NULL;

-- Update handle_new_user function to check for pending profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if a pending profile exists for this email
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email AND status = 'pending') THEN
    -- Link the user_id and activate the profile
    UPDATE public.profiles 
    SET user_id = NEW.id,
        status = 'active',
        updated_at = now()
    WHERE email = NEW.email AND status = 'pending';
  ELSE
    -- Create new profile as before
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      'client'::user_role
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Add RLS policy for coaches to insert pending clients
CREATE POLICY "Coaches can insert pending clients"
ON public.profiles FOR INSERT
WITH CHECK (
  is_coach(auth.uid()) AND status = 'pending'
);