-- Add invite code columns to profiles
ALTER TABLE profiles
ADD COLUMN invite_code text UNIQUE,
ADD COLUMN invite_link_enabled boolean DEFAULT true;

-- Generate unique invite codes for existing coaches
UPDATE profiles
SET invite_code = substring(md5(random()::text || id::text) from 1 for 8)
WHERE role = 'coach' AND invite_code IS NULL;

-- Create index for fast lookup
CREATE INDEX idx_profiles_invite_code ON profiles(invite_code);

-- Create trigger function to auto-generate invite codes for new coaches
CREATE OR REPLACE FUNCTION public.generate_coach_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'coach' AND NEW.invite_code IS NULL THEN
    NEW.invite_code := substring(md5(random()::text || NEW.id::text) from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER tr_generate_coach_invite_code
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_coach_invite_code();

-- Allow public read of coach profiles via invite code (for join page)
CREATE POLICY "Public can read coach profiles by invite code"
ON profiles FOR SELECT
TO anon
USING (role = 'coach' AND invite_code IS NOT NULL AND invite_link_enabled = true);

-- Allow anon users to insert new client profiles during signup
CREATE POLICY "Anon can insert client profiles during signup"
ON profiles FOR INSERT
TO anon
WITH CHECK (role = 'client');