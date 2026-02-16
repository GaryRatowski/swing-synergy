-- Create checkin_templates table
CREATE TABLE checkin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template fields (JSON schema for flexibility)
  fields JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT checkin_template_unique_per_program UNIQUE(program_id, name)
);

-- Create checkin_submissions table
CREATE TABLE checkin_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checkin_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Submission data (JSON to match template fields)
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT checkin_submission_unique_per_week UNIQUE(template_id, client_id, DATE_TRUNC('week', submitted_at))
);

-- Create indexes
CREATE INDEX idx_checkin_templates_program_id ON checkin_templates(program_id);
CREATE INDEX idx_checkin_templates_created_by ON checkin_templates(created_by);
CREATE INDEX idx_checkin_submissions_template_id ON checkin_submissions(template_id);
CREATE INDEX idx_checkin_submissions_client_id ON checkin_submissions(client_id);
CREATE INDEX idx_checkin_submissions_coach_id ON checkin_submissions(coach_id);
CREATE INDEX idx_checkin_submissions_submitted_at ON checkin_submissions(submitted_at);

-- RLS Policies

-- Coaches can view/create checkin_templates for their programs
ALTER TABLE checkin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can create templates for their programs"
  ON checkin_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = checkin_templates.program_id
      AND programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view templates for their programs"
  ON checkin_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM programs
      WHERE programs.id = checkin_templates.program_id
      AND programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update templates for their programs"
  ON checkin_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Coaches can delete templates for their programs"
  ON checkin_templates FOR DELETE
  USING (created_by = auth.uid());

-- Clients can view submissions they made, coaches can view all for their clients
ALTER TABLE checkin_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can submit check-ins"
  ON checkin_submissions FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM checkin_templates
      JOIN client_programs ON client_programs.program_id = checkin_templates.program_id
      WHERE checkin_templates.id = checkin_submissions.template_id
      AND client_programs.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own submissions"
  ON checkin_submissions FOR SELECT
  USING (
    client_id = auth.uid()
    OR coach_id = auth.uid()
  );

CREATE POLICY "Coaches can view client submissions"
  ON checkin_submissions FOR SELECT
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM checkin_templates
      WHERE checkin_templates.id = checkin_submissions.template_id
      AND checkin_templates.created_by = auth.uid()
    )
  );
