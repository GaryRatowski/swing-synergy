-- Fix 1: Make swing-videos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'swing-videos';

-- Fix 2: Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Anyone can view swing videos" ON storage.objects;

-- Fix 3: Create proper authenticated access policy for swing videos
-- Coaches can view all videos, clients can only view their own
CREATE POLICY "Authenticated users can view swing videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'swing-videos' 
  AND auth.uid() IS NOT NULL
  AND (
    -- Coaches can view all videos
    public.is_coach(auth.uid())
    OR 
    -- Clients can view their own videos
    EXISTS (
      SELECT 1 FROM public.swing_videos sv
      JOIN public.profiles p ON p.id = sv.client_id
      WHERE p.user_id = auth.uid()
      AND sv.video_url LIKE '%' || storage.filename(name) || '%'
    )
  )
);

-- Fix 4: Drop the public coach profiles policy that exposes email/phone
DROP POLICY IF EXISTS "Public can read coach profiles by invite code" ON public.profiles;

-- Fix 5: Create a more restrictive policy that only exposes necessary data
-- We'll use a function to safely expose minimal coach info for invite links
CREATE OR REPLACE FUNCTION public.get_coach_by_invite_code(code text)
RETURNS TABLE (
  id uuid,
  full_name text,
  invite_code text,
  invite_link_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.invite_code,
    p.invite_link_enabled
  FROM public.profiles p
  WHERE p.role = 'coach'
    AND p.invite_code = code
    AND p.invite_link_enabled = true;
$$;