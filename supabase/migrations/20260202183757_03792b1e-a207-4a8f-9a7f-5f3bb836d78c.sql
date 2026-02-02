-- Add superset_group column to program_exercises for grouping exercises into supersets
ALTER TABLE public.program_exercises 
ADD COLUMN IF NOT EXISTS superset_group text NULL;