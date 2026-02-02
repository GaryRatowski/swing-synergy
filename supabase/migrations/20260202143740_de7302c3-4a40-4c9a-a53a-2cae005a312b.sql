-- Create private storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 
  'message-attachments', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create message_attachments table
CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for messages they can see
CREATE POLICY "Users can view message attachments"
ON public.message_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE m.id = message_attachments.message_id
    AND (p.id = m.sender_id OR p.id = m.receiver_id)
  )
);

-- Users can insert attachments for messages they sent
CREATE POLICY "Users can insert message attachments"
ON public.message_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE m.id = message_attachments.message_id
    AND p.id = m.sender_id
  )
);

-- Storage policies for message-attachments bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view attachments in conversations they're part of
CREATE POLICY "Users can view message attachments storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.message_attachments ma
    JOIN public.messages m ON m.id = ma.message_id
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ma.file_path = name
    AND (p.id = m.sender_id OR p.id = m.receiver_id)
  )
);

-- Users can delete their own uploaded attachments
CREATE POLICY "Users can delete own message attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);