import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Link,
    Hr,
} from '@react-email/components';
import * as React from 'react';

export default function WelcomeEmail() {
    return (
        <Html>
            <Head />
            <Preview>Welcome to The Signal - Your journey into AI & Philosophy begins here.</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Welcome to The Signal</Heading>

                    <Text style={text}>
                        Thank you for subscribing to PhilAI Connect's weekly digest.
                    </Text>

                    <Text style={text}>
                        Every week, we use cutting-edge language models to extract, summarize, and synthesize the most critical debates emerging at the intersection of Artificial Intelligence and Philosophical thought.
                    </Text>

                    <Section style={featureSection}>
                        <Text style={featureTitle}>What to Expect:</Text>
                        <Text style={featureText}>
                            • <strong>The Big Picture</strong>: High-level trends combining computer science and ethics.<br />
                            • <strong>New Lineages</strong>: Fresh papers building upon existing philosophical schools.<br />
                            • <strong>3-Sentence TL;DRs</strong>: AI-generated summaries to save you time.
                        </Text>
                    </Section>

                    <Text style={text}>
                        We believe that understanding the trajectory of Artificial Intelligence requires looking backward at the millennia of human thought that laid its foundation. We're excited to have you with us on this journey.
                    </Text>

                    <Section style={buttonContainer}>
                        <Link href="https://philai-connect.vercel.app" style={button}>
                            Explore the Argument Map
                        </Link>
                    </Section>

                    <Hr style={hr} />

                    <Text style={footer}>
                        PhilAI Connect — Mapping the intersection of mind and machine.<br />
                        You received this email because you subscribed on our website.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

// Styles
const main = {
    backgroundColor: '#020617', // slate-950
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: '40px 0',
};

const container = {
    margin: '0 auto',
    padding: '40px 20px',
    width: '600px',
    backgroundColor: '#0f172a', // slate-900
    borderRadius: '16px',
    border: '1px solid #1e293b', // slate-800
};

const h1 = {
    color: '#34d399', // emerald-400
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '0 0 20px',
};

const text = {
    color: '#cbd5e1', // slate-300
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 20px',
};

const featureSection = {
    backgroundColor: '#1e293b', // slate-800
    padding: '20px',
    borderRadius: '12px',
    margin: '0 0 20px',
};

const featureTitle = {
    color: '#f8fafc', // slate-50
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 10px',
};

const featureText = {
    color: '#94a3b8', // slate-400
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '30px 0',
};

const button = {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald-500/10 equivalent
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '9999px',
    color: '#34d399',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const hr = {
    borderColor: '#334155', // slate-700
    margin: '30px 0 20px',
};

const footer = {
    color: '#64748b', // slate-500
    fontSize: '13px',
    lineHeight: '20px',
    textAlign: 'center' as const,
};
