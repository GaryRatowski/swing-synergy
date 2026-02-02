-- Add policy for coaches to create/update/delete workout logs for any client
CREATE POLICY "Coaches can manage all workout logs"
ON public.workout_logs
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));