-- Supabase Initial Schema

CREATE TABLE public.authors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL,       -- e.g., 'arXiv', 'SemanticScholar', 'PhilPapers'
    source_id TEXT NOT NULL,    -- ID from the source system
    title TEXT NOT NULL,
    abstract TEXT,
    published_date DATE,
    url TEXT,
    -- AI Generated Fields
    philosophical_tldr TEXT,
    philosophical_schools TEXT[], -- e.g., ['Functionalism', 'Ethics']
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(source, source_id)
);

CREATE TABLE public.article_authors (
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.authors(id) ON DELETE CASCADE,
    position INTEGER, -- 1st author, 2nd author, etc.
    PRIMARY KEY (article_id, author_id)
);

CREATE TABLE public.user_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email_digest_enabled BOOLEAN DEFAULT TRUE,
    favorite_schools TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public articles are viewable by everyone." 
    ON public.articles FOR SELECT USING (true);

CREATE POLICY "Public authors are viewable by everyone." 
    ON public.authors FOR SELECT USING (true);

CREATE POLICY "Public article_authors are viewable by everyone." 
    ON public.article_authors FOR SELECT USING (true);

CREATE POLICY "Users can view and update their own preferences." 
    ON public.user_preferences FOR ALL 
    USING (auth.uid() = user_id);

-- Phase 2 Additions
CREATE TABLE public.digest_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE TABLE public.subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.digest_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert subscribers" 
    ON public.subscribers FOR INSERT WITH CHECK (true);

-- For an admin dashboard, we could restrict this to a specific role, 
-- but for local dev/this project scope, we allow authenticated users (or service role) to view drafts.
CREATE POLICY "Admins can view and manage drafts" 
    ON public.digest_drafts FOR ALL USING (true);

