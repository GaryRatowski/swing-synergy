-- Add workouts_per_week column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS workouts_per_week integer DEFAULT 3;

-- Add current_day column to client_programs table
ALTER TABLE public.client_programs 
ADD COLUMN IF NOT EXISTS current_day integer DEFAULT 1;

-- Add last_workout_date column to track progression
ALTER TABLE public.client_programs 
ADD COLUMN IF NOT EXISTS last_workout_date date DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN programs.workouts_per_week IS 'Number of workout days per week for structured programs';
COMMENT ON COLUMN client_programs.current_day IS 'Current day within the week for structured programs';
COMMENT ON COLUMN client_programs.last_workout_date IS 'Date of last completed workout for tracking progression';