-- Add energy_level column to workout_logs for client feedback
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS energy_level integer;

-- Add comment for documentation
COMMENT ON COLUMN public.workout_logs.energy_level IS 'Client self-reported energy level 1-10';