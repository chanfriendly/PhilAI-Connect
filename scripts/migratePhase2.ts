import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('Applying Phase 2 schema migrations...');

    // Note: The Supabase JS client doesn't have a direct 'execute raw SQL' method over the REST API
    // However, we can use the postgres functions (if exposed) or fall back to the dashboard.
    // Given the limitations here, we will create an rpc function trick or just ask the user.
    // Wait, the easiest way is to use the `pg` library to connect to the connection string.

    console.log('Setup requires direct postgres connection or dashboard execution.');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log(`
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

CREATE POLICY "Public can insert subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view and manage drafts" ON public.digest_drafts FOR ALL USING (true);
    `);
}

applyMigration();
