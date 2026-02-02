-- Create a security definer function to check if user is a coach
CREATE OR REPLACE FUNCTION public.is_coach(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = 'coach'::user_role
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Coaches can view all profiles" ON public.profiles;

-- Create new policy using the security definer function
CREATE POLICY "Coaches can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_coach(auth.uid())
  );