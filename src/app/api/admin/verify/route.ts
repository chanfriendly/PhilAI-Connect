import { NextResponse } from 'next/server';

/**
 * POST /api/admin/verify
 * Validates the admin password against the ADMIN_PASSWORD env variable.
 * Returns { success: true } on match, 401 otherwise.
 *
 * Set ADMIN_PASSWORD in your .env.local to enable admin access.
 */
export async function POST(request: Request) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error('ADMIN_PASSWORD env variable is not set.');
        return NextResponse.json(
            { success: false, error: 'Admin access is not configured on this server.' },
            { status: 500 }
        );
    }

    try {
        const { password } = await request.json();
        if (password === adminPassword) {
            return NextResponse.json({ success: true });
        }
        return NextResponse.json(
            { success: false, error: 'Incorrect password.' },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request body.' },
            { status: 400 }
        );
    }
}
