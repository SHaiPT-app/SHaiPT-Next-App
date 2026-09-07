import { test, expect, type Page } from '@playwright/test';

/**
 * The tester journey against a real project: sign in as a tester, see home, and walk the loop.
 * Needs TEST_EMAIL and TEST_PASSWORD (an account from `pnpm db:test-users`); skipped otherwise.
 * With AI_MOCK=1 on the server the AI steps use canned replies and cost nothing.
 */
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL / TEST_PASSWORD not set');

async function signIn(page: Page) {
    await page.goto('/login');
    await page.getByPlaceholder('Email or Username').fill(EMAIL!);
    await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
}

/** The access token from the @supabase/ssr cookie (chunked or not). */
async function accessToken(page: Page): Promise<string | null> {
    const cookies = await page.context().cookies();
    const parts = cookies.filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    if (!parts.length) return null;
    let raw = parts.map((c) => c.value).join('');
    if (raw.startsWith('base64-')) raw = Buffer.from(raw.slice(7), 'base64').toString('utf8');
    try { return JSON.parse(decodeURIComponent(raw)).access_token ?? null; } catch { try { return JSON.parse(raw).access_token ?? null; } catch { return null; } }
}

test('signs in and lands on home', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test('the session survives a reload and the API accepts the token', async ({ page }) => {
    await signIn(page);
    await page.reload();
    await expect(page).toHaveURL(/\/home/);
    const token = await accessToken(page);
    expect(token).toBeTruthy();
    const res = await page.request.get('/api/notifications?countOnly=true', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
});
