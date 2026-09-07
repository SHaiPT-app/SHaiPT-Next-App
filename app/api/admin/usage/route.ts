/**
 * GET /api/admin/usage?month=YYYY-MM → this month's AI spend by feature and by user.
 * For Ali: the caller must be signed in and listed in ADMIN_EMAILS (comma-separated).
 * Reads with the service role (ai_usage / ai_budget are not readable by users).
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, forbidden } from '@/lib/auth';
import { usageReport, currentMonth } from '@/lib/ai/gateway';

export const DEFAULT_ADMINS = ['alihomaei1997@gmail.com'];

export function isAdminEmail(email: string | undefined | null): boolean {
    if (!email) return false;
    const list = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS.join(','))
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    return list.includes(email.toLowerCase());
}

export async function GET(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;
    if (!isAdminEmail(auth.user.email)) return forbidden('Admin only');

    const month = new URL(request.url).searchParams.get('month');
    const report = await usageReport(month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonth());
    return NextResponse.json(report);
}
