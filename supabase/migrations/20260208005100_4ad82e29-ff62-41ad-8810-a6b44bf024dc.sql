-- Add workout_log_id to performance_metrics to link metrics to specific sessions
ALTER TABLE public.performance_metrics 
ADD COLUMN workout_log_id uuid REFERENCES workout_logs(id) ON DELETE SET NULL;

-- Create index for performance when querying by workout_log_id
CREATE INDEX idx_performance_metrics_workout_log_id ON public.performance_metrics(workout_log_id);

-- Add order_index column to exercise_logs if not exists (for ordering exercises in a session)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'exercise_logs' AND column_name = 'order_index') THEN
    ALTER TABLE public.exercise_logs ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- Add rpe column to exercise_logs if not exists (for per-exercise RPE tracking)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'exercise_logs' AND column_name = 'rpe') THEN
    ALTER TABLE public.exercise_logs ADD COLUMN rpe integer;
  END IF;
END $$;