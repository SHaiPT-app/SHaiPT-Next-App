/**
 * API error logging that `vercel logs` can be searched with.
 *
 *   const id = logError('ai-coach/chat', userId, err);
 *   return NextResponse.json({ error: 'Something went wrong. Tell Ali: ' + id }, { status: 500 });
 *
 * Every line starts with `[api:<route>]`, then `user=<id>` and `req=<short id>`. The request id
 * is what the user sees in the "something went wrong" fallback, so Ali can find the line.
 */
import { randomBytes } from 'node:crypto';

export function requestId(): string {
    return randomBytes(4).toString('hex');
}

export function logError(route: string, userId: string | null | undefined, err: unknown, extra?: Record<string, unknown>): string {
    const id = requestId();
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const detail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.error(`[api:${route}] user=${userId ?? '-'} req=${id} ${message}${detail}`);
    if (err instanceof Error && err.stack && process.env.NODE_ENV !== 'production') console.error(err.stack);
    return id;
}

export function logInfo(route: string, userId: string | null | undefined, message: string, extra?: Record<string, unknown>): void {
    const detail = extra ? ` ${JSON.stringify(extra)}` : '';
    console.log(`[api:${route}] user=${userId ?? '-'} ${message}${detail}`);
}

/** The user-facing text for an unexpected failure, with the id Ali can search for. */
export function failureMessage(id: string): string {
    return `Something went wrong on our side. Tell Ali what you were doing and quote ${id}.`;
}
