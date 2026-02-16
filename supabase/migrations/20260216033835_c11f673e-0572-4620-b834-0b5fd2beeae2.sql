
-- Create checkin_templates table
CREATE TABLE public.checkin_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checkin_templates ENABLE ROW LEVEL SECURITY;

-- Coaches can manage checkin templates
CREATE POLICY "Coaches can manage checkin templates"
  ON public.checkin_templates
  FOR ALL
  USING (is_coach(auth.uid()))
  WITH CHECK (is_coach(auth.uid()));

-- Clients can view active templates for their assigned programs
CREATE POLICY "Clients can view active checkin templates"
  ON public.checkin_templates
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM client_programs cp
      JOIN profiles p ON p.id = cp.client_id
      WHERE p.user_id = auth.uid()
        AND cp.program_id = checkin_templates.program_id
        AND cp.is_active = true
    )
  );
