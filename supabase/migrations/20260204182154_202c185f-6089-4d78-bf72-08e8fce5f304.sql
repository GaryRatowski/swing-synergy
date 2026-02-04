-- Add new columns to performance_metrics for physical metrics tracking
ALTER TABLE public.performance_metrics
ADD COLUMN IF NOT EXISTS client_display_value VARCHAR(50),
ADD COLUMN IF NOT EXISTS client_display_trend VARCHAR(20) DEFAULT 'baseline',
ADD COLUMN IF NOT EXISTS is_bilateral BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS value_left DECIMAL,
ADD COLUMN IF NOT EXISTS value_right DECIMAL;

-- Add constraint for valid trend values
ALTER TABLE public.performance_metrics
ADD CONSTRAINT valid_trend_values 
CHECK (client_display_trend IN ('up', 'down', 'stable', 'baseline'));

-- Create index for faster metric lookups
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_date 
ON public.performance_metrics(client_id, metric_type, recorded_date DESC);