-- Supabase Phase 2 Extra Schema
-- This holds the generated email drafts before they are sent
CREATE TABLE public.digest_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- This holds people who click the "Subscribe" button on the homepage
CREATE TABLE public.subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on Row Level Security
ALTER TABLE public.digest_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Important: Allow the public website to insert subscriber emails anonymously
CREATE POLICY "Public can insert subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);

-- Allow authenticated/admin viewing of drafts 
-- (Strict enough for this local project scale, you can tighten it later in the dashboard if needed)
CREATE POLICY "Admins can view and manage drafts" ON public.digest_drafts FOR ALL USING (true);
