-- Create contact_submissions table for storing contact form data
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Service role (via edge function) handles all operations
-- No user-facing policies needed since this is a public contact form

-- Add index for querying by date
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);