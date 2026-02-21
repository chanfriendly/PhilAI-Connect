import { NextResponse } from 'next/server';
import SignalDigestEmail from '@/emails/SignalDigest';
import { supabase } from '@/lib/db/supabase';

// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        // In a real scenario, this would be an authenticated endpoint or a cron job.
        // We would query Supabase for users who have email_digest_enabled = true
        // For this example, we'll parse an email from the request body or use a dummy list.

        // 1. Fetch users subscribed
        // const { data: users, error } = await supabase.from('user_preferences').select('email').eq('email_digest_enabled', true);

        // 2. Fetch recent Top 5 Debates from Database
        // Simulated data for now:
        const mockItems = [
            {
                id: '1',
                title: 'Is Large Language Model Reasoning Just Advanced Pattern Matching?',
                tldr: 'This paper challenges the notion that LLMs possess genuine reasoning capabilities, arguing they merely retrieve complex patterns from their training data. It suggests that true understanding requires embodied grounding in the physical world.',
                schools: ['Connectionism', 'Phenomenology'],
                url: 'https://arxiv.org/abs/example1'
            },
            {
                id: '2',
                title: 'The AI Alignment Problem as a Meta-Ethical Dilemma',
                tldr: 'Authors argue that AI alignment cannot be solved purely technically because human values themselves are fundamentally disputed. They propose a virtue ethics framework for AI development rather than utilitarian reward maximizing.',
                schools: ['Virtue Ethics', 'Utilitarianism'],
                url: 'https://philpapers.org/rec/example2'
            }
        ];

        const today = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const emailHtml = SignalDigestEmail({ date: today, items: mockItems });

        const subject = `The Signal: This Week in AI & Philosophy (${today})`;

        // Insert draft into Supabase for human review
        const { data, error: insertError } = await supabase
            .from('digest_drafts')
            .insert([{
                subject: subject,
                html_content: emailHtml,
                status: 'draft'
            }])
            .select('id')
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, message: 'Draft created successfully', draftId: data?.id });
    } catch (error) {
        console.error('Email dispatch error:', error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
