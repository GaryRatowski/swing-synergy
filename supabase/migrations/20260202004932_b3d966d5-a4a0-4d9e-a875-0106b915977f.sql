-- Create table for Google Calendar connections
CREATE TABLE public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  google_refresh_token TEXT,
  google_calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Coaches can only access their own connections
CREATE POLICY "Coaches can manage their own calendar connections"
ON public.google_calendar_connections
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.id = google_calendar_connections.coach_id
  AND p.role = 'coach'::user_role
));

-- Create table for mapping Google events to workout logs
CREATE TABLE public.calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT NOT NULL UNIQUE,
  workout_log_id UUID REFERENCES workout_logs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  event_title TEXT,
  event_start TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Coaches can manage event mappings (via is_coach function)
CREATE POLICY "Coaches can manage event mappings"
ON public.calendar_event_mappings
FOR ALL
USING (is_coach(auth.uid()));