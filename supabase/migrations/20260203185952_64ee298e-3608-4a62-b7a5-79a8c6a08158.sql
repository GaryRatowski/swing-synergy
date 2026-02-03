-- Create exercise_flags table for tracking pain/discomfort during workouts
CREATE TABLE public.exercise_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  exercise_log_id UUID REFERENCES public.exercise_logs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  flag_type VARCHAR NOT NULL DEFAULT 'discomfort',
  description TEXT NOT NULL,
  flagged_date DATE DEFAULT CURRENT_DATE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  coach_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coaches can manage all flags"
ON public.exercise_flags
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their own flags"
ON public.exercise_flags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = exercise_flags.client_id
));

CREATE POLICY "Clients can create their own flags"
ON public.exercise_flags
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = exercise_flags.client_id
));

-- Create index for efficient coach queries
CREATE INDEX idx_exercise_flags_pending ON public.exercise_flags(reviewed_by) WHERE reviewed_by IS NULL;
CREATE INDEX idx_exercise_flags_client ON public.exercise_flags(client_id, flagged_date DESC);