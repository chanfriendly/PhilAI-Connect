import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/db/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { id, action } = await req.json();

        if (!id || !action) {
            return NextResponse.json({ success: false, error: 'Missing id or action' }, { status: 400 });
        }

        // Fetch the draft
        const { data: draft, error: fetchError } = await supabase
            .from('digest_drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !draft) throw fetchError || new Error('Draft not found');

        if (action === 'delete') {
            await supabase.from('digest_drafts').delete().eq('id', id);
            return NextResponse.json({ success: true, message: 'Draft deleted' });
        }

        if (action === 'send') {
            if (draft.status === 'sent') {
                return NextResponse.json({ success: false, error: 'Draft already sent' }, { status: 400 });
            }

            // Fetch active subscribers
            const { data: subscribers, error: subError } = await supabase
                .from('subscribers')
                .select('email')
                .eq('active', true);

            if (subError) throw subError;

            // Ensure we have people to send to (or use a test email if none)
            const bccList = subscribers && subscribers.length > 0
                ? subscribers.map(s => s.email)
                : ['test@example.com'];

            // Send via Resend
            const resendResponse = await resend.emails.send({
                from: 'PhilAI Connect Digest <onboarding@resend.dev>', // Verified domain goes here
                to: ['noreply@philaiconnect.com'], // Primary recipient (often yourself or absolute dummy)
                bcc: bccList,
                subject: draft.subject,
                html: draft.html_content,
            });

            // Mark as sent in DB
            await supabase
                .from('digest_drafts')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', id);

            return NextResponse.json({ success: true, data: resendResponse });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Admin action error:', error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
