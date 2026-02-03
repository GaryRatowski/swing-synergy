-- Add new columns to workout_logs for structured and freestyle session logging
ALTER TABLE public.workout_logs
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'in-person',
ADD COLUMN IF NOT EXISTS coach_notes TEXT,
ADD COLUMN IF NOT EXISTS client_homework_notes TEXT,
ADD COLUMN IF NOT EXISTS key_findings TEXT,
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.coach_appointments(id) ON DELETE SET NULL;

-- Add index for fast chronological queries
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_date ON public.workout_logs(client_id, workout_date DESC);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Coaches can manage all workout logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Coaches can view workout logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can manage their workout logs" ON public.workout_logs;

-- New RLS policies

-- Coaches can do everything on all logs
CREATE POLICY "Coaches can manage all workout logs"
ON public.workout_logs
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

-- Clients can view all their own logs (read-only access to in-person sessions)
CREATE POLICY "Clients can view their own logs"
ON public.workout_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = workout_logs.client_id
  )
);

-- Clients can insert their own homework logs
CREATE POLICY "Clients can create homework logs"
ON public.workout_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = workout_logs.client_id
  )
  AND (session_type = 'homework' OR session_type IS NULL)
);

-- Clients can update their own homework logs only
CREATE POLICY "Clients can update their homework logs"
ON public.workout_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = workout_logs.client_id
  )
  AND session_type = 'homework'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = workout_logs.client_id
  )
  AND session_type = 'homework'
);

-- Clients can delete their own homework logs only
CREATE POLICY "Clients can delete their homework logs"
ON public.workout_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = workout_logs.client_id
  )
  AND session_type = 'homework'
);