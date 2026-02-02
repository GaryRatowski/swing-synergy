-- Allow coaches to insert, update, and delete metrics for clients
CREATE POLICY "Coaches can manage client metrics"
ON public.performance_metrics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'coach'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'coach'::user_role
  )
);