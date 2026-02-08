-- Add scoring formula and thresholds to assessment templates
ALTER TABLE assessment_templates
ADD COLUMN scoring_formula jsonb DEFAULT '{}'::jsonb,
ADD COLUMN scoring_thresholds jsonb DEFAULT '{"poor": 40, "fair": 60, "good": 80}'::jsonb;

-- Add calculated scores to assessment logs
ALTER TABLE assessment_logs
ADD COLUMN calculated_scores jsonb DEFAULT '{}'::jsonb;