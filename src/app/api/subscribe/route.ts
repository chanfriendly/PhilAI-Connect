import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('subscribers')
            .insert([{ email }])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation gracefully
            if (error.code === '23505') {
                return NextResponse.json({ success: true, message: 'Already subscribed' });
            }
            throw error;
        }

        return NextResponse.json({ success: true, message: 'Subscribed successfully', data });

    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
