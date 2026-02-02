-- Add recurrence fields to coach_appointments
ALTER TABLE public.coach_appointments
ADD COLUMN recurrence_type TEXT DEFAULT NULL,
ADD COLUMN recurrence_end_date DATE DEFAULT NULL,
ADD COLUMN parent_appointment_id UUID REFERENCES public.coach_appointments(id) ON DELETE CASCADE;

-- Create index for parent appointment lookups
CREATE INDEX idx_coach_appointments_parent ON public.coach_appointments(parent_appointment_id);