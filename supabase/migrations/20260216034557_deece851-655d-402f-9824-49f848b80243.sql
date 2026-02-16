
-- 1. Workout templates table
CREATE TABLE public.workout_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- 2. Program workout assignments table (before template exercises, so RLS can reference it)
CREATE TABLE public.program_workout_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.workout_templates(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  week_number INTEGER DEFAULT 1,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, template_id, day_of_week, week_number)
);

ALTER TABLE public.program_workout_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Workout template exercises table
CREATE TABLE public.workout_template_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER DEFAULT 0,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  tempo TEXT,
  notes TEXT,
  superset_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_templates
CREATE POLICY "Coaches can manage own workout templates"
  ON public.workout_templates FOR ALL
  USING (is_coach(auth.uid()) AND coach_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (is_coach(auth.uid()) AND coach_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Coaches can view all workout templates"
  ON public.workout_templates FOR SELECT
  USING (is_coach(auth.uid()));

-- RLS Policies for program_workout_assignments
CREATE POLICY "Coaches can manage workout assignments"
  ON public.program_workout_assignments FOR ALL
  USING (is_coach(auth.uid()))
  WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their assigned workouts"
  ON public.program_workout_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM client_programs cp
    JOIN profiles p ON p.id = cp.client_id AND p.user_id = auth.uid()
    WHERE cp.program_id = program_workout_assignments.program_id AND cp.is_active = true
  ));

-- RLS Policies for workout_template_exercises
CREATE POLICY "Coaches can manage template exercises"
  ON public.workout_template_exercises FOR ALL
  USING (is_coach(auth.uid()))
  WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view assigned template exercises"
  ON public.workout_template_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM program_workout_assignments pwa
    JOIN client_programs cp ON cp.program_id = pwa.program_id AND cp.is_active = true
    JOIN profiles p ON p.id = cp.client_id AND p.user_id = auth.uid()
    WHERE pwa.template_id = workout_template_exercises.template_id
  ));

-- Trigger for updated_at
CREATE TRIGGER update_workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
