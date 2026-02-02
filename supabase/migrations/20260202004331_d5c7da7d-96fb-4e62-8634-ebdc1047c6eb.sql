-- Create client_documents table
CREATE TABLE public.client_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  category text DEFAULT 'general',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Coaches can manage all documents
CREATE POLICY "Coaches can manage all documents"
ON public.client_documents
FOR ALL
USING (public.is_coach(auth.uid()));

-- Clients can view their own documents
CREATE POLICY "Clients can view their own documents"
ON public.client_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.id = client_documents.client_id
  )
);

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false);

-- Storage policies: Coaches can upload/manage files
CREATE POLICY "Coaches can upload client documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents'
  AND public.is_coach(auth.uid())
);

CREATE POLICY "Coaches can view client documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND public.is_coach(auth.uid())
);

CREATE POLICY "Coaches can update client documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-documents'
  AND public.is_coach(auth.uid())
);

CREATE POLICY "Coaches can delete client documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-documents'
  AND public.is_coach(auth.uid())
);

-- Clients can view their own folder
CREATE POLICY "Clients can view their own documents in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (storage.foldername(name))[1] = p.id::text
  )
);