-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('coach', 'client');

-- Create membership types enum
CREATE TYPE public.membership_type AS ENUM ('individual_coaching', 'community', 'program_only');

-- Create exercise categories enum
CREATE TYPE public.exercise_category AS ENUM ('power', 'strength', 'mobility', 'plyometric', 'speed', 'stability', 'rotation', 'recovery');

-- Create difficulty levels enum
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  membership_type membership_type,
  coach_id UUID REFERENCES public.profiles(id),
  golf_experience TEXT,
  goals TEXT,
  injury_history TEXT,
  fitness_level TEXT,
  handicap DECIMAL(4,1),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exercises library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body_part TEXT,
  description TEXT,
  difficulty difficulty_level DEFAULT 'intermediate',
  equipment_needed TEXT,
  exercise_type exercise_category,
  video_url TEXT,
  thumbnail_url TEXT,
  coaching_cues TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Program templates
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  training_phase TEXT,
  duration_weeks INTEGER DEFAULT 4,
  session_type TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client program assignments
CREATE TABLE public.client_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  current_week INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Program exercises junction
CREATE TABLE public.program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  week_number INTEGER DEFAULT 1,
  day_number INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10',
  tempo TEXT,
  rest_seconds INTEGER DEFAULT 60,
  target_rpe INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workout logs
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  workout_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  overall_rpe INTEGER CHECK (overall_rpe >= 1 AND overall_rpe <= 10),
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exercise logs within workouts
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id),
  sets_completed INTEGER,
  reps_completed TEXT,
  weight_used TEXT,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance metrics (clubhead speed, etc.)
CREATE TABLE public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit TEXT,
  recorded_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages for 1-on-1 chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habit tracking
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_value DECIMAL(10,2),
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habit logs
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  logged_date DATE DEFAULT CURRENT_DATE,
  value DECIMAL(10,2),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Exercises RLS policies
CREATE POLICY "Authenticated users can view exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches can insert exercises" ON public.exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches can update exercises" ON public.exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

CREATE POLICY "Coaches can delete exercises" ON public.exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Programs RLS policies
CREATE POLICY "Coaches can manage programs" ON public.programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

CREATE POLICY "Clients can view assigned programs" ON public.programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_programs cp
      JOIN public.profiles p ON p.id = cp.client_id
      WHERE p.user_id = auth.uid()
      AND cp.program_id = public.programs.id
    )
  );

-- Client programs RLS
CREATE POLICY "Coaches can manage client programs" ON public.client_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

CREATE POLICY "Clients can view their programs" ON public.client_programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.client_programs.client_id
    )
  );

-- Program exercises RLS
CREATE POLICY "Authenticated can view program exercises" ON public.program_exercises
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Coaches can manage program exercises" ON public.program_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Workout logs RLS
CREATE POLICY "Users can manage their workout logs" ON public.workout_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.workout_logs.client_id
    )
  );

CREATE POLICY "Coaches can view workout logs" ON public.workout_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Exercise logs RLS
CREATE POLICY "Users can manage their exercise logs" ON public.exercise_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs wl
      JOIN public.profiles p ON p.id = wl.client_id
      WHERE p.user_id = auth.uid()
      AND wl.id = public.exercise_logs.workout_log_id
    )
  );

CREATE POLICY "Coaches can view exercise logs" ON public.exercise_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Performance metrics RLS
CREATE POLICY "Users can manage their metrics" ON public.performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.performance_metrics.client_id
    )
  );

CREATE POLICY "Coaches can view metrics" ON public.performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'coach'
    )
  );

-- Messages RLS
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND (p.id = public.messages.sender_id OR p.id = public.messages.receiver_id)
    )
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.messages.sender_id
    )
  );

CREATE POLICY "Users can update their received messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.messages.receiver_id
    )
  );

-- Habits RLS
CREATE POLICY "Users can manage their habits" ON public.habits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.id = public.habits.client_id
    )
  );

-- Habit logs RLS
CREATE POLICY "Users can manage their habit logs" ON public.habit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.habits h
      JOIN public.profiles p ON p.id = h.client_id
      WHERE p.user_id = auth.uid()
      AND h.id = public.habit_logs.habit_id
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();