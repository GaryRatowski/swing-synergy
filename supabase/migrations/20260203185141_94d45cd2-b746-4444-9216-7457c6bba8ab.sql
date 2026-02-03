-- Create swing_videos table
CREATE TABLE public.swing_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  video_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  recorded_date DATE DEFAULT CURRENT_DATE,
  club_type VARCHAR NOT NULL DEFAULT 'driver',
  context VARCHAR NOT NULL DEFAULT 'practice',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.swing_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coaches can manage all swing videos"
ON public.swing_videos
FOR ALL
USING (is_coach(auth.uid()))
WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Clients can view their own videos"
ON public.swing_videos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = swing_videos.client_id
));

CREATE POLICY "Clients can upload their own videos"
ON public.swing_videos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = swing_videos.client_id
));

CREATE POLICY "Clients can update their own videos"
ON public.swing_videos
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = swing_videos.uploaded_by
));

CREATE POLICY "Clients can delete their own videos"
ON public.swing_videos
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = auth.uid() AND p.id = swing_videos.uploaded_by
));

-- Create storage bucket for swing videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('swing-videos', 'swing-videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-m4v']);

-- Storage policies
CREATE POLICY "Anyone can view swing videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'swing-videos');

CREATE POLICY "Authenticated users can upload swing videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'swing-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own swing videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'swing-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own swing videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'swing-videos' AND auth.role() = 'authenticated');