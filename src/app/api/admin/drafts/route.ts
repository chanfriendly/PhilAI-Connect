import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function GET() {
    try {
        const { data: drafts, error } = await supabase
            .from('digest_drafts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, drafts });
    } catch (error) {
        console.error('Failed to fetch drafts:', error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
