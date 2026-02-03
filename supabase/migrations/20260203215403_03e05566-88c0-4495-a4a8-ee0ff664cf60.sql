-- Create homework_assignments table
CREATE TABLE public.homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  name VARCHAR NOT NULL,
  frequency_type VARCHAR NOT NULL DEFAULT 'daily',
  frequency_count INT DEFAULT 7,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_frequency_type CHECK (frequency_type IN ('daily', 'weekly_3x', 'weekly_2x', 'weekly_1x', 'custom'))
);

-- Create homework_exercises table
CREATE TABLE public.homework_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INT DEFAULT 0,
  sets INT DEFAULT 3,
  reps VARCHAR DEFAULT '10',
  tempo VARCHAR,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add homework_assignment_id to workout_logs
ALTER TABLE public.workout_logs
ADD COLUMN homework_assignment_id UUID REFERENCES public.homework_assignments(id);

-- Enable RLS
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for homework_assignments
CREATE POLICY "Coaches can manage homework assignments"
ON public.homework_assignments
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their own homework"
ON public.homework_assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = homework_assignments.client_id
));

-- RLS Policies for homework_exercises
CREATE POLICY "Coaches can manage homework exercises"
ON public.homework_exercises
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their homework exercises"
ON public.homework_exercises
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM homework_assignments ha
  JOIN profiles p ON p.id = ha.client_id
  WHERE p.user_id = auth.uid() AND ha.id = homework_exercises.homework_assignment_id
));

-- Create indexes for performance
CREATE INDEX idx_homework_assignments_client ON public.homework_assignments(client_id);
CREATE INDEX idx_homework_assignments_active ON public.homework_assignments(client_id, is_active) WHERE is_active = true;
CREATE INDEX idx_homework_exercises_assignment ON public.homework_exercises(homework_assignment_id);
CREATE INDEX idx_workout_logs_homework ON public.workout_logs(homework_assignment_id) WHERE homework_assignment_id IS NOT NULL;