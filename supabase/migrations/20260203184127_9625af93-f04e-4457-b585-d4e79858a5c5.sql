-- Create assessment_templates table
CREATE TABLE public.assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assessment_logs table
CREATE TABLE public.assessment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  template_id UUID REFERENCES public.assessment_templates(id) ON DELETE SET NULL,
  assessed_date DATE DEFAULT CURRENT_DATE,
  assessed_by UUID NOT NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_templates
CREATE POLICY "Coaches can manage assessment templates"
ON public.assessment_templates FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Authenticated users can view templates"
ON public.assessment_templates FOR SELECT
USING (true);

-- RLS policies for assessment_logs
CREATE POLICY "Coaches can manage all assessment logs"
ON public.assessment_logs FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their own assessments"
ON public.assessment_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = assessment_logs.client_id
));

CREATE POLICY "Clients can create their own assessments"
ON public.assessment_logs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = assessment_logs.client_id
));

-- Create index for faster queries
CREATE INDEX idx_assessment_logs_client_id ON public.assessment_logs(client_id);
CREATE INDEX idx_assessment_logs_template_id ON public.assessment_logs(template_id);
CREATE INDEX idx_assessment_logs_assessed_date ON public.assessment_logs(assessed_date DESC);

-- Add trigger for updated_at on templates
CREATE TRIGGER update_assessment_templates_updated_at
BEFORE UPDATE ON public.assessment_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for assessment files
INSERT INTO storage.buckets (id, name, public) VALUES ('assessment-files', 'assessment-files', false);

-- Storage policies for assessment files
CREATE POLICY "Coaches can upload assessment files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assessment-files' AND is_coach(auth.uid()));

CREATE POLICY "Coaches can view assessment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assessment-files' AND is_coach(auth.uid()));

CREATE POLICY "Clients can upload their own assessment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-files' AND 
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1])
);

CREATE POLICY "Clients can view their own assessment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assessment-files' AND 
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.id::text = (storage.foldername(name))[1])
);