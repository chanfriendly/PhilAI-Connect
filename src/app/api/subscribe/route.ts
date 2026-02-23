import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/WelcomeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

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

        // Dispatch Welcome Email via Resend
        if (process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'The Signal <onboarding@resend.dev>', // Update this to verified domain later
                    to: email,
                    subject: 'Welcome to The Signal: AI & Philosophy',
                    react: WelcomeEmail() as React.ReactElement,
                });
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
                // We don't fail the whole request just because the welcome email failed
            }
        }

        return NextResponse.json({ success: true, message: 'Subscribed successfully', data });

    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
