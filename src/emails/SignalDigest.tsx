import { Html, Head, Preview, Body, Container, Section, Text, Heading, Link, Hr } from '@react-email/components';
import * as React from 'react';

export interface DigestItem {
    id: string;
    title: string;
    tldr: string;
    schools: string[];
    url: string;
}

interface SignalDigestEmailProps {
    date: string;
    items: DigestItem[];
}

export const SignalDigestEmail = ({ date, items }: SignalDigestEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>The Signal: This Week in AI & Philosophy ({date})</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>The Signal</Heading>
                    <Text style={subtitle}>Mapping the intersection of Artificial Intelligence and Philosophy. Here are the top discussions from {date}.</Text>

                    <Hr style={hr} />

                    {items.map((item, index) => (
                        <Section key={item.id} style={itemSection}>
                            <Heading as="h2" style={h2}>
                                {index + 1}. <Link href={item.url} style={link}>{item.title}</Link>
                            </Heading>

                            <Text style={schoolsText}>
                                <strong>Schools:</strong> {item.schools.join(', ')}
                            </Text>

                            <Text style={tldrText}>
                                {item.tldr}
                            </Text>
                            <Hr style={hrLighter} />
                        </Section>
                    ))}

                    <Text style={footer}>
                        Sent by PhilAI Connect. <Link href="https://philai-connect.com/unsubscribe" style={unsubscribeLink}>Unsubscribe</Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default SignalDigestEmail;

// Inline styles for email compatibility
const main = {
    backgroundColor: '#020617',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '40px 20px',
    maxWidth: '600px',
};

const h1 = {
    color: '#34d399', // emerald-400
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '0 0 10px 0',
};

const subtitle = {
    color: '#cbd5e1', // slate-300
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'center' as const,
    margin: '0 0 30px 0',
};

const hr = {
    borderColor: '#334155', // slate-700
    margin: '30px 0',
};

const hrLighter = {
    borderColor: '#1e293b', // slate-800
    margin: '20px 0',
};

const itemSection = {
    marginBottom: '30px',
};

const h2 = {
    color: '#f8fafc', // slate-50
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
};

const link = {
    color: '#38bdf8', // sky-400
    textDecoration: 'none',
};

const schoolsText = {
    color: '#94a3b8', // slate-400
    fontSize: '14px',
    margin: '0 0 10px 0',
};

const tldrText = {
    color: '#e2e8f0', // slate-200
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
    backgroundColor: '#0f172a', // slate-900
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #1e293b', // slate-800
};

const footer = {
    color: '#64748b', // slate-500
    fontSize: '12px',
    textAlign: 'center' as const,
    marginTop: '40px',
};

const unsubscribeLink = {
    color: '#64748b',
    textDecoration: 'underline',
};
