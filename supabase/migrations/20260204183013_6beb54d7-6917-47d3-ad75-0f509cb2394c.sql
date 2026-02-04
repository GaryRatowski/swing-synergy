-- Create metric_definitions table
CREATE TABLE public.metric_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  unit VARCHAR NOT NULL,
  is_bilateral BOOLEAN DEFAULT false,
  category VARCHAR NOT NULL CHECK (category IN ('Golf Performance', 'Physical Assessment', 'Custom')),
  description TEXT,
  is_system_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create client_active_metrics table
CREATE TABLE public.client_active_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_type VARCHAR NOT NULL,
  enabled_by UUID NOT NULL REFERENCES public.profiles(id),
  enabled_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, metric_type)
);

-- Create foreign key reference for metric_type
ALTER TABLE public.client_active_metrics
ADD CONSTRAINT client_active_metrics_metric_type_fkey
FOREIGN KEY (metric_type) REFERENCES public.metric_definitions(metric_type) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_active_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for metric_definitions
CREATE POLICY "Authenticated users can view metric definitions"
ON public.metric_definitions
FOR SELECT
USING (true);

CREATE POLICY "Coaches can insert metric definitions"
ON public.metric_definitions
FOR INSERT
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Coaches can update their own custom metrics"
ON public.metric_definitions
FOR UPDATE
USING (
  is_coach(auth.uid()) AND 
  is_system_default = false AND 
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can delete their own custom metrics"
ON public.metric_definitions
FOR DELETE
USING (
  is_coach(auth.uid()) AND 
  is_system_default = false AND 
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- RLS Policies for client_active_metrics
CREATE POLICY "Coaches can view all client active metrics"
ON public.client_active_metrics
FOR SELECT
USING (is_coach(auth.uid()));

CREATE POLICY "Clients can view their own active metrics"
ON public.client_active_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = client_active_metrics.client_id
  )
);

CREATE POLICY "Coaches can insert client active metrics"
ON public.client_active_metrics
FOR INSERT
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Coaches can update client active metrics"
ON public.client_active_metrics
FOR UPDATE
USING (is_coach(auth.uid()));

CREATE POLICY "Coaches can delete client active metrics"
ON public.client_active_metrics
FOR DELETE
USING (is_coach(auth.uid()));

-- Seed system default metrics

-- Golf Performance metrics
INSERT INTO public.metric_definitions (metric_type, display_name, unit, is_bilateral, category, is_system_default, description)
VALUES 
  ('clubhead_speed', 'Clubhead Speed', 'mph', false, 'Golf Performance', true, 'The speed of the clubhead at impact'),
  ('ball_speed', 'Ball Speed', 'mph', false, 'Golf Performance', true, 'The speed of the ball immediately after impact'),
  ('handicap', 'Handicap', 'strokes', false, 'Golf Performance', true, 'Official handicap index'),
  ('carry_distance', 'Carry Distance', 'yards', false, 'Golf Performance', true, 'Distance the ball travels in the air'),
  ('smash_factor', 'Smash Factor', '', false, 'Golf Performance', true, 'Ratio of ball speed to clubhead speed'),
  ('launch_angle', 'Launch Angle', '°', false, 'Golf Performance', true, 'Initial angle of ball flight'),
  ('spin_rate', 'Spin Rate', 'rpm', false, 'Golf Performance', true, 'Ball spin rate at launch');

-- Physical Assessment metrics
INSERT INTO public.metric_definitions (metric_type, display_name, unit, is_bilateral, category, is_system_default, description)
VALUES 
  ('hip_mobility', 'Hip Mobility', '°', true, 'Physical Assessment', true, 'Range of motion in hip internal and external rotation'),
  ('thoracic_rotation', 'Thoracic Rotation', '°', true, 'Physical Assessment', true, 'Rotational mobility in the thoracic spine'),
  ('ankle_mobility', 'Ankle Mobility', '°', true, 'Physical Assessment', true, 'Dorsiflexion range of motion'),
  ('vertical_jump', 'Vertical Jump', 'in', false, 'Physical Assessment', true, 'Maximum vertical jump height'),
  ('single_leg_balance', 'Single Leg Balance', 'sec', true, 'Physical Assessment', true, 'Time able to maintain single leg balance'),
  ('med_ball_throw', 'Med Ball Throw', 'ft', false, 'Physical Assessment', true, 'Rotational med ball throw distance');

-- Backfill: Create client_active_metrics entries for existing performance_metrics
INSERT INTO public.client_active_metrics (client_id, metric_type, enabled_by, enabled_date)
SELECT DISTINCT 
  pm.client_id,
  pm.metric_type,
  COALESCE(p.coach_id, pm.client_id) as enabled_by,
  MIN(pm.recorded_date)
FROM public.performance_metrics pm
LEFT JOIN public.profiles p ON p.id = pm.client_id
WHERE EXISTS (SELECT 1 FROM public.metric_definitions md WHERE md.metric_type = pm.metric_type)
GROUP BY pm.client_id, pm.metric_type, p.coach_id
ON CONFLICT (client_id, metric_type) DO NOTHING;