-- Create coach_appointments table for scheduling
CREATE TABLE public.coach_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  appointment_type TEXT DEFAULT 'training',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Coaches can manage their own appointments
CREATE POLICY "Coaches can manage their own appointments"
ON public.coach_appointments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.id = coach_appointments.coach_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_coach_appointments_updated_at
BEFORE UPDATE ON public.coach_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_coach_appointments_coach_id ON public.coach_appointments(coach_id);
CREATE INDEX idx_coach_appointments_start_time ON public.coach_appointments(start_time);