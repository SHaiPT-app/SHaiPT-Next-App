import { test, expect } from '@playwright/test';

/**
 * Access control that needs no database: route protection, API authentication and the
 * invite-only sign-up. Runs against `pnpm dev` (reuseExistingServer) or the deployed site
 * with PLAYWRIGHT_BASE_URL.
 */

const PROTECTED = ['/home', '/ai', '/plans', '/nutrition', '/trainer', '/trainer/client/abc', '/settings', '/onboarding'];

for (const path of PROTECTED) {
    test(`signed-out visit to ${path} lands on /login with next=${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    });
}

test('public pages stay public', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SHaiPT/);
    await page.goto('/demo');
    await expect(page).not.toHaveURL(/\/login/);
});

test('API routes refuse missing and bogus tokens', async ({ request }) => {
    for (const path of ['/api/notifications', '/api/admin/usage', '/api/nutrition']) {
        const anonymous = await request.get(path);
        expect(anonymous.status(), `${path} without a token`).toBe(401);
        const bogus = await request.get(path, { headers: { Authorization: 'Bearer not-a-token' } });
        expect(bogus.status(), `${path} with a bogus token`).toBe(401);
    }
    const post = await request.post('/api/ai-coach/chat', { data: { messages: [{ role: 'user', content: 'hi' }], userId: 'someone' } });
    expect(post.status()).toBe(401);
});

test('the invite check refuses an unknown email and rejects bad input', async ({ request }) => {
    const unknown = await request.post('/api/invites/check', { data: { email: `nobody-${Date.now()}@example.com` } });
    expect(unknown.status()).toBe(200);
    expect(await unknown.json()).toEqual({ allowed: false });
    const empty = await request.post('/api/invites/check', { data: {} });
    expect(empty.status()).toBe(400);
});

test('sign-up without an invite is told SHaiPT is invite-only', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByPlaceholder('Email').fill(`stranger-${Date.now()}@example.com`);
    await page.getByPlaceholder('Username').fill(`stranger${Date.now() % 100000}`);
    await page.getByPlaceholder('Password', { exact: true }).fill('Str0ng-passw0rd!');
    await page.getByPlaceholder('Confirm Password').fill('Str0ng-passw0rd!');
    await page.getByRole('button', { name: 'Sign Up' }).last().click();
    await expect(page.getByText('SHaiPT is invite-only for now')).toBeVisible({ timeout: 20_000 });
});
