import { test, expect, type Page, type Browser } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The trainer / trainee loop against a real project, in two browser contexts:
 * request → accept → roster → assign an AI plan → message both ways.
 *
 * Needs a trainer (TRAINER_EMAIL / TRAINER_PASSWORD, from
 * `pnpm db:test-users -- --trainer email`) and SUPABASE_SERVICE_ROLE_KEY; skipped otherwise.
 * With AI_MOCK=1 on the server the plan step costs nothing.
 *
 * The trainee is created for the run and deleted after it, which keeps the spec repeatable —
 * a second coaching request to the same coach is a 409 — and stops it from fighting over an
 * account another spec is signed in to.
 */
const TRAINER_EMAIL = process.env.TRAINER_EMAIL;
const TRAINER_PASSWORD = process.env.TRAINER_PASSWORD;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

test.skip(
    !TRAINER_EMAIL || !TRAINER_PASSWORD || !SERVICE_KEY || !SUPABASE_URL,
    'TRAINER_EMAIL / TRAINER_PASSWORD / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL not set',
);

/** A trainee of this spec's own, so a parallel run cannot drive the same account. */
const TRAINEE_EMAIL = `coached-${Date.now()}@shaipt.com`;
const TRAINEE_PASSWORD = 'Coached-Passw0rd-4k';

/** The whole loop is one test: each step is the setup for the next. */
test.describe.configure({ mode: 'serial', timeout: 5 * 60_000 });

function admin(): SupabaseClient {
    return createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function profileByEmail(sb: SupabaseClient, email: string) {
    const { data } = await sb.from('profiles').select('id, full_name, username, email').ilike('email', email).maybeSingle();
    return data as { id: string; full_name?: string; username?: string } | null;
}

/** What the coach card and the roster print for someone. */
function displayName(profile: { full_name?: string; username?: string } | null, email: string) {
    return profile?.full_name || profile?.username || email.split('@')[0];
}

async function signIn(browser: Browser, email: string, password: string): Promise<Page> {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (process.env.E2E_DEBUG) {
        const who = email.split('@')[0];
        page.on('console', (m) => { if (m.type() === 'error') console.log(`[${who}] console ${m.text().slice(0, 200)}`); });
        page.on('pageerror', (e) => console.log(`[${who}] pageerror ${String(e).slice(0, 200)}`));
        page.on('request', (r) => { if (r.url().includes('/api/')) console.log(`[${who}] -> ${r.method()} ${new URL(r.url()).pathname}`); });
        page.on('response', (r) => { if (r.url().includes('/api/') || r.status() >= 400) console.log(`[${who}] <- ${r.status()} ${new URL(r.url()).pathname}`); });
    }
    await page.goto('/login');
    await page.getByRole('button', { name: 'Login' }).waitFor();
    await page.getByPlaceholder('Email or Username').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/(home|trainer)/, { timeout: 60_000 });
    return page;
}

/** The page's own tabs have text; the header's icon buttons only have an aria-label. */
const tab = (page: Page, name: string) => page.getByRole('button').filter({ hasText: new RegExp(`^${name}$`) });

let traineeId: string | null = null;

test.beforeAll(async () => {
    const sb = admin();
    await sb.from('invites').upsert({ email: TRAINEE_EMAIL, role: 'trainee', note: 'e2e trainer loop' }, { onConflict: 'email' });
    const { data, error } = await sb.auth.admin.createUser({
        email: TRAINEE_EMAIL,
        password: TRAINEE_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'Loop Trainee', role: 'trainee' },
    });
    if (error || !data.user) throw new Error(`could not create the trainee: ${error?.message}`);
    traineeId = data.user.id;
    await sb.from('profiles').update({ role: 'trainee', tester: true }).eq('id', traineeId);
    await sb.from('user_preferences').upsert({ user_id: traineeId }, { onConflict: 'user_id' });
});

test.afterAll(async () => {
    const sb = admin();
    if (traineeId) await sb.auth.admin.deleteUser(traineeId);
    await sb.from('invites').delete().eq('email', TRAINEE_EMAIL);
});

test('a trainee is coached: request, accept, plan, messages', async ({ browser }) => {
    const sb = admin();
    const trainee = await profileByEmail(sb, TRAINEE_EMAIL);
    const trainer = await profileByEmail(sb, TRAINER_EMAIL!);

    const traineeName = displayName(trainee, TRAINEE_EMAIL);
    const trainerName = displayName(trainer, TRAINER_EMAIL!);

    // ── the trainee asks the trainer to coach them ─────────────────────────────
    const asTrainee = await signIn(browser, TRAINEE_EMAIL, TRAINEE_PASSWORD);
    await asTrainee.goto('/coach');
    await asTrainee.getByRole('button', { name: 'Human Coaches' }).click();
    await expect(asTrainee.getByText(trainerName).first()).toBeVisible({ timeout: 30_000 });
    await asTrainee.getByText(trainerName).first().click();
    await asTrainee.getByRole('button', { name: 'Send Request' }).click();
    await expect(asTrainee.getByText(/Request Sent/i)).toBeVisible({ timeout: 30_000 });

    // ── the trainer accepts, and the trainee appears on the roster ─────────────
    const asTrainer = await signIn(browser, TRAINER_EMAIL!, TRAINER_PASSWORD!);
    // a trainer lands on their own dashboard, not the trainee home
    await expect(asTrainer).toHaveURL(/\/trainer/);
    await expect(asTrainer.getByText(/Pending Requests \(1\)/)).toBeVisible({ timeout: 30_000 });
    await expect(asTrainer.getByText(TRAINEE_EMAIL)).toBeVisible();
    await asTrainer.getByRole('button', { name: /^Accept/ }).first().click();
    await expect(asTrainer.getByText('Client Roster')).toBeVisible({ timeout: 30_000 });
    await expect(asTrainer.getByText(traineeName).first()).toBeVisible({ timeout: 30_000 });
    // the section header goes; the "PENDING REQUESTS" stat tile stays, reading 0
    await expect(asTrainer.getByText(/Pending Requests \(/)).toHaveCount(0);

    // ── the trainer generates and assigns a plan ───────────────────────────────
    await asTrainer.getByText(traineeName).first().click();
    await expect(asTrainer).toHaveURL(/\/trainer\/client\//, { timeout: 30_000 });
    await tab(asTrainer, 'Plans').click();
    await asTrainer.getByRole('button', { name: 'Assign New Plan' }).click();
    await asTrainer.getByRole('button', { name: 'AI-Assisted' }).click();
    await asTrainer.getByRole('button', { name: 'Generate & Assign Plan' }).click();
    // the assign page returns to the client once the plan is generated, saved and assigned
    const returned = await asTrainer
        .waitForURL(/\/trainer\/client\/[^/]+$/, { timeout: 180_000 })
        .then(() => true)
        .catch(() => false);
    if (!returned) {
        // say what the page is showing rather than only that the URL never changed
        throw new Error('the assign page did not return to the client:\n' + (await asTrainer.locator('body').innerText()));
    }
    await tab(asTrainer, 'Plans').click();
    await expect(asTrainer.getByText(/[1-9]\d* plans? assigned/)).toBeVisible({ timeout: 30_000 });

    const { data: assignments } = await sb
        .from('training_plan_assignments')
        .select('is_self_assigned, is_active')
        .eq('user_id', trainee!.id)
        .eq('is_self_assigned', false);
    expect(assignments?.some((a) => a.is_active)).toBe(true);

    // ── they message each other ────────────────────────────────────────────────
    const fromCoach = `Nice session. Add 2.5 kg next time. (${Date.now()})`;
    await tab(asTrainer, 'Messages').click();
    const coachComposer = asTrainer.getByPlaceholder('Type a message...');
    await coachComposer.waitFor({ timeout: 30_000 });
    await coachComposer.fill(fromCoach);
    await coachComposer.press('Enter');
    await expect(asTrainer.getByText(fromCoach)).toBeVisible({ timeout: 30_000 });

    await asTrainee.goto('/dms');
    await expect(asTrainee.getByText(fromCoach)).toBeVisible({ timeout: 30_000 });
    await asTrainee.getByText(trainerName).first().click();

    const reply = `Will do, thanks. (${Date.now()})`;
    const traineeComposer = asTrainee.getByPlaceholder('Type a message...');
    await traineeComposer.waitFor({ timeout: 30_000 });
    await traineeComposer.fill(reply);
    await traineeComposer.press('Enter');
    await expect(asTrainee.getByText(reply)).toBeVisible({ timeout: 30_000 });

    await asTrainer.reload();
    await tab(asTrainer, 'Messages').click();
    await expect(asTrainer.getByText(reply)).toBeVisible({ timeout: 30_000 });
});
