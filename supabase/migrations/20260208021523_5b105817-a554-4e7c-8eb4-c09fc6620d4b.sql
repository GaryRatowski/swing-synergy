-- Allow coaches to delete client profiles
CREATE POLICY "Coaches can delete client profiles"
ON profiles FOR DELETE
USING (
  is_coach(auth.uid()) 
  AND role = 'client'
);