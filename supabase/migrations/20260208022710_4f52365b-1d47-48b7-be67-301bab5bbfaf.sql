-- Store generated progress reports
CREATE TABLE public.progress_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  share_token text UNIQUE,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_progress_reports_client ON public.progress_reports(client_id);
CREATE INDEX idx_progress_reports_coach ON public.progress_reports(coach_id);
CREATE INDEX idx_progress_reports_share_token ON public.progress_reports(share_token);
CREATE INDEX idx_progress_reports_period ON public.progress_reports(period_start, period_end);

-- Enable RLS
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- Clients can view their own reports
CREATE POLICY "Clients can view their own reports"
ON public.progress_reports
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = progress_reports.client_id
));

-- Coaches can manage all reports
CREATE POLICY "Coaches can manage all reports"
ON public.progress_reports
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

-- Public can view reports via share token (for sharing with parents, etc.)
CREATE POLICY "Public can view shared reports"
ON public.progress_reports
FOR SELECT
USING (share_token IS NOT NULL);

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_reports;