import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The tester journey against a real project: sign in as a tester, see home, and walk the loop
 * a friend would walk — coach interview, plan, workout, nutrition, chat, progress, 4Dcoach.
 * Needs TEST_EMAIL and TEST_PASSWORD (an account from `pnpm db:test-users`); skipped otherwise.
 * With AI_MOCK=1 on the server the AI steps use canned replies and cost nothing.
 *
 * The long walk runs as a throw-away account created and deleted with the service role, so it
 * starts from nothing every time and leaves nothing behind. Without SUPABASE_SERVICE_ROLE_KEY
 * that part skips and only the sign-in checks run.
 *
 * Sign-up is not part of this: the project has "Confirm email" on, so a self-service sign-up
 * stops at "check your email". e2e/access.spec.ts covers the invite gate on that form.
 */
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL / TEST_PASSWORD not set');

async function signIn(page: Page, email = EMAIL!, password = PASSWORD!) {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Login' }).waitFor();
    await page.getByPlaceholder('Email or Username').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(password);
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

// ── the whole loop, on an account that starts from nothing ─────────────────────

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe('a new tester walks the loop', () => {
    test.skip(!SERVICE_KEY || !SUPABASE_URL, 'SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not set');
    test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 });

    const email = `journey-${Date.now()}@shaipt.com`;
    const password = 'Journey-Passw0rd-7q';
    let admin: SupabaseClient;
    let userId: string | null = null;

    test.beforeAll(async () => {
        admin = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
        await admin.from('invites').upsert({ email, role: 'trainee', note: 'e2e tester journey' }, { onConflict: 'email' });
        const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Journey Tester', role: 'trainee' },
        });
        if (error || !data.user) throw new Error(`could not create the journey account: ${error?.message}`);
        userId = data.user.id;
        await admin.from('profiles').update({ role: 'trainee', tester: true }).eq('id', userId);
        await admin.from('user_preferences').upsert({ user_id: userId }, { onConflict: 'user_id' });
    });

    test.afterAll(async () => {
        if (userId) await admin.auth.admin.deleteUser(userId);
        await admin.from('invites').delete().eq('email', email);
    });

    test('interview, plan, workout, nutrition, chat, progress', async ({ page }) => {
        const failures: string[] = [];
        page.on('response', (r) => { if (r.status() >= 400) failures.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });

        await signIn(page, email, password);
        await expect(page.getByTestId('start-workout-card')).toBeVisible({ timeout: 30_000 });

        // ── coach: waiver, interview, split, plan ──────────────────────────────
        await page.goto('/coach');
        await page.getByTestId('coach-card-everyday-fitness').click();
        await page.getByTestId('start-training-btn').click();

        // first visit only: accept the health disclaimer. It renders after the terms check
        // comes back, so wait for the button rather than looking for the checkbox at once.
        const acceptWaiver = page.getByTestId('accept-waiver-btn');
        const waiverShown = await acceptWaiver
            .waitFor({ timeout: 30_000 })
            .then(() => true)
            .catch(() => false);
        if (waiverShown) {
            await page.locator('input[type=checkbox]').first().check();
            await expect(acceptWaiver).toBeEnabled();
            await acceptWaiver.click();
        }

        const answers = [
            "I'm Alex, 29, 178 cm, 76 kg.",
            'Build muscle and get stronger.',
            'Intermediate, two years of training.',
            'Four days a week, an hour a session.',
            'A commercial gym with everything.',
            'No injuries and no medical conditions.',
            'Compound free weights, in the morning.',
        ];
        const composer = page.getByPlaceholder('Type your answer...');
        await composer.waitFor({ timeout: 60_000 });
        for (const answer of answers) {
            if (!(await composer.count()) || !(await composer.isVisible())) break; // the interview ended early
            await composer.fill(answer);
            await composer.press('Enter');
            await page.waitForTimeout(1500);
        }

        await expect(page.getByText('Choose Your Training Split')).toBeVisible({ timeout: 120_000 });
        await page.getByRole('button', { name: /Full Body/ }).first().click();
        await page.getByRole('button', { name: 'Generate My Plan' }).click();
        await expect(page.getByText('Saved')).toBeVisible({ timeout: 180_000 });

        await page.goto('/home');
        await expect(page.getByText(/1 saved plan available/)).toBeVisible({ timeout: 30_000 });

        // ── the workout, through to the summary ───────────────────────────────
        await page.goto('/home/workout');
        await page.getByTestId('start-today-workout-btn').click();
        await page.getByRole('button', { name: 'Start Workout' }).click();
        await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible({ timeout: 60_000 });

        // 4Dcoach covers form, and the mapped exercises link to it
        await expect(page.getByTestId('fourd-form-check-link')).toHaveAttribute('href', /#live=/);

        for (let i = 0; i < 60; i++) {
            const skip = page.getByRole('button', { name: 'Skip Rest' });
            if (await skip.count() && await skip.first().isVisible()) { await skip.first().click(); continue; }

            const complete = page.getByRole('button', { name: 'Complete Set' });
            if (await complete.count() && await complete.first().isVisible()) {
                const numbers = page.locator('input[type=number]');
                const n = await numbers.count();
                if (n >= 2) {
                    await numbers.nth(n - 2).fill(String(40 + i));
                    await numbers.nth(n - 1).fill('8');
                }
                await complete.first().click();
                continue;
            }

            const next = page.getByRole('button', { name: 'Next Exercise' });
            if (await next.count() && await next.first().isVisible()) { await next.first().click(); continue; }

            const finish = page.getByRole('button', { name: 'Finish Workout' });
            if (await finish.count() && await finish.first().isVisible()) { await finish.first().click(); break; }

            await page.waitForTimeout(500);
        }
        await expect(page.getByText(/Coach Feedback/i)).toBeVisible({ timeout: 120_000 });

        // ── nutrition: a plan, its macros and its grocery list ────────────────
        await page.goto('/nutrition');
        await page.getByRole('button', { name: 'Generate Meal Plan' }).click();
        await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible({ timeout: 180_000 });

        await page.goto('/nutrition/tracking');
        // the tiles are uppercased in CSS, so match the DOM's own casing
        await expect(page.getByText(/protein/i).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText(/\/ [1-9]\d* kcal/)).toBeVisible({ timeout: 30_000 });

        await page.goto('/nutrition/grocery');
        await page.getByRole('button', { name: 'Generate Grocery List' }).click();
        await expect(page.getByText(/proteins/i).first()).toBeVisible({ timeout: 60_000 });
        // one row per food, not one per serving and one per week
        await expect(page.getByText(/for the week/).first()).toBeVisible();

        // ── the coach chat, and that it comes back after a reload ─────────────
        await page.goto('/ai');
        const question = `How many rest days this week? (${Date.now()})`;
        await page.getByPlaceholder('Ask me anything about fitness...').fill(question);
        await page.getByRole('button', { name: 'Send' }).click();
        await expect(page.getByText(question)).toBeVisible({ timeout: 60_000 });
        // wait for the reply: reloading mid-stream aborts the POST before it saves anything
        await expect(page.getByTestId('chat-message-assistant')).not.toBeEmpty({ timeout: 60_000 });
        await page.reload();
        await expect(page.getByText(question)).toBeVisible({ timeout: 60_000 });

        // ── progress: the workout is counted, with records and a weekly insight ──
        await page.goto('/progress');
        await expect(page.getByText(/personal records/i).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText(/new pr/i).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText(/No workouts recorded yet/)).toHaveCount(0);

        // ── body measurements reach the weight chart ──────────────────────────
        await page.goto('/body');
        await page.getByRole('button', { name: 'Log New Measurements' }).click();
        const numeric = page.locator('input[type=number]');
        await numeric.first().waitFor({ timeout: 30_000 });
        await numeric.nth(0).fill('76.4');
        await page.getByRole('button', { name: 'Save Measurements' }).click();
        await expect(page.getByText(/latest entry/i).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText('nullcm')).toHaveCount(0);

        expect(failures, `unexpected responses: ${failures.join(', ')}`).toEqual([]);
    });
});
