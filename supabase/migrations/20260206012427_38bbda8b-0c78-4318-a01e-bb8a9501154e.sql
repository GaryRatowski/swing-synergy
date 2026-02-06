-- Drop the restrictive coach SELECT-only policy
DROP POLICY IF EXISTS "Coaches can view exercise logs" ON public.exercise_logs;

-- Create comprehensive policy for coaches to manage all exercise logs
CREATE POLICY "Coaches can manage all exercise logs" 
ON public.exercise_logs 
FOR ALL 
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));