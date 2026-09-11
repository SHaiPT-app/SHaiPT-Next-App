/**
 * Row-level-security check against the live Supabase project.
 *
 *   pnpm db:rls-check
 *
 * Creates two throw-away users with the service role (rls-a-<stamp>@shaipt.test and
 * rls-b-…), inserts one private row per table as user A, and asserts with the anon client that
 * B reads none of them, that A reads their own, that B cannot write into A's rows, and that a
 * coach linked to A *can* read A's logs. Deletes both users at the end (also on failure).
 * Exit code 1 when any assertion fails.
 */
import { adminClient, anonClient } from './db';
import type { SupabaseClient } from '@supabase/supabase-js';

const stamp = Date.now().toString(36);
const PASSWORD = `Rls-${stamp}-Check!9`;
let failures = 0;

function ok(cond: boolean, label: string) {
    console.log(`${cond ? '  ok  ' : '  FAIL'} ${label}`);
    if (!cond) failures++;
}

async function createUser(admin: SupabaseClient, email: string, role: 'trainee' | 'trainer') {
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: email.split('@')[0], role },
    });
    if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
    await admin.from('profiles').update({ role }).eq('id', data.user.id);
    const session = anonClient();
    const { data: signIn, error: signInError } = await session.auth.signInWithPassword({ email, password: PASSWORD });
    if (signInError || !signIn.session) throw new Error(`signIn ${email}: ${signInError?.message}`);
    return { id: data.user.id, client: anonClient(signIn.session.access_token) };
}

type CountQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

async function count(client: SupabaseClient, table: string, filter?: (q: CountQuery) => CountQuery): Promise<number> {
    let q = client.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: n, error } = await q;
    if (error) {
        // a permission error also means "cannot read"
        return -1;
    }
    return n ?? 0;
}

async function main() {
    const admin = adminClient();
    const a = await createUser(admin, `rls-a-${stamp}@shaipt.test`, 'trainee');
    const b = await createUser(admin, `rls-b-${stamp}@shaipt.test`, 'trainee');
    const coach = await createUser(admin, `rls-c-${stamp}@shaipt.test`, 'trainer');
    const ids = [a.id, b.id, coach.id];

    try {
        // ---- A writes one row into each private table (through RLS, as A) ----
        const today = new Date().toISOString().slice(0, 10);
        const { data: log, error: logErr } = await a.client.from('workout_logs')
            .insert({ user_id: a.id, date: today, started_at: new Date().toISOString() }).select('id').single();
        ok(!logErr && !!log, `A inserts workout_log (${logErr?.message ?? 'ok'})`);
        const logId = log?.id as string;

        const writes: Array<[string, Record<string, unknown>]> = [
            ['exercise_logs', { workout_log_id: logId, exercise_id: 'Barbell_Squat', exercise_order: 0, sets: [{ set_number: 1, reps: 5, weight: 60, weight_unit: 'kg' }] }],
            ['ai_chats', { user_id: a.id, title: 'rls', messages: [{ role: 'user', content: 'hi' }] }],
            ['training_plans', { creator_id: a.id, name: 'rls plan', is_public: false }],
            ['nutrition_plans', { user_id: a.id, name: 'rls diet' }],
            ['food_logs', { user_id: a.id, food_name: 'apple', meal_type: 'snack', calories: 52 }],
            ['body_measurements', { user_id: a.id, date: today, weight_kg: 70 }],
            ['personal_records', { user_id: a.id, exercise_id: 'Barbell_Squat', max_weight: 60, achieved_at: new Date().toISOString() }],
            ['onboarding', { user_id: a.id, fitness_goals: ['strength'] }],
            ['direct_messages', { sender_id: a.id, recipient_id: coach.id, content: 'hello coach' }],
        ];
        for (const [table, row] of writes) {
            const { error } = await a.client.from(table).insert(row);
            ok(!error, `A inserts ${table} (${error?.message ?? 'ok'})`);
        }

        // ---- B must see nothing of A's ----
        for (const table of ['workout_logs', 'exercise_logs', 'ai_chats', 'training_plans', 'nutrition_plans', 'food_logs', 'body_measurements', 'personal_records', 'onboarding', 'direct_messages', 'ai_usage']) {
            const n = await count(b.client, table);
            ok(n === 0, `B reads 0 rows of ${table} (got ${n})`);
        }
        ok((await count(b.client, 'invites')) <= 0, 'B cannot read invites');
        ok((await count(b.client, 'ai_budget')) <= 0, 'B cannot read ai_budget');

        // ---- B cannot write into A's data ----
        const { error: forge } = await b.client.from('workout_logs').insert({ user_id: a.id, date: today });
        ok(!!forge, 'B cannot insert a workout_log for A');
        const { data: upd } = await b.client.from('profiles').update({ full_name: 'hacked' }).eq('id', a.id).select('id');
        ok(!upd || upd.length === 0, 'B cannot update A\'s profile');
        const { data: elog } = await b.client.from('exercise_logs').update({ total_reps: 999 }).eq('workout_log_id', logId).select('id');
        ok(!elog || elog.length === 0, 'B cannot update A\'s exercise_logs');

        // ---- A sees their own ----
        ok((await count(a.client, 'workout_logs')) === 1, 'A reads own workout_log');
        ok((await count(a.client, 'ai_chats')) === 1, 'A reads own ai_chat');
        /* profiles used to be readable by everyone — USING (true) — and this check asserted that
           as if it were the requirement, so it went green while a signed-in stranger could read
           every member's email, date of birth and body stats. 0170 split the two needs apart:
           profiles is yours (plus the clients you actively coach), and public_profiles carries the
           handful of columns search and the trainer cards actually want. */
        ok((await count(a.client, 'profiles')) === 1, 'A reads only their own profile row');
        ok((await count(a.client, 'public_profiles')) >= 3, 'A can still read public_profiles (search / trainer cards)');
        const { error: emailLeak } = await a.client.from('public_profiles').select('email').limit(1);
        ok(!!emailLeak, 'public_profiles exposes no email column, so select(\'*\') cannot leak one');

        // ---- coach: not linked → nothing; linked & active → A's logs ----
        ok((await count(coach.client, 'workout_logs')) === 0, 'unlinked coach reads 0 workout_logs');
        const { error: reqErr } = await coach.client.from('coaching_relationships')
            .insert({ coach_id: coach.id, athlete_id: a.id, requested_by: coach.id });
        ok(!reqErr, `coach sends request (${reqErr?.message ?? 'ok'})`);
        ok((await count(a.client, 'notifications', (q) => q.eq('type', 'coaching_request'))) === 1, 'A got the coaching_request notification');
        ok((await count(coach.client, 'workout_logs')) === 0, 'pending coach still reads 0 workout_logs');
        const { error: accErr } = await a.client.from('coaching_relationships').update({ status: 'active' }).eq('athlete_id', a.id);
        ok(!accErr, `A accepts (${accErr?.message ?? 'ok'})`);
        ok((await count(coach.client, 'workout_logs')) === 1, 'active coach reads A\'s workout_log');
        ok((await count(coach.client, 'exercise_logs')) === 1, 'active coach reads A\'s exercise_log');
        ok((await count(coach.client, 'body_measurements')) === 1, 'active coach reads A\'s body_measurements');
        ok((await count(coach.client, 'ai_chats')) === 0, 'coach never reads A\'s ai_chats');
        ok((await count(coach.client, 'notifications', (q) => q.eq('type', 'coaching_accepted'))) === 1, 'coach got the coaching_accepted notification');
        ok((await count(b.client, 'workout_logs')) === 0, 'B still reads 0 workout_logs');

        // ---- exercises are readable by everyone ----
        ok((await count(anonClient(), 'exercises')) >= 0, 'anon can read exercises');
    } finally {
        for (const id of ids) await admin.auth.admin.deleteUser(id);
        console.log(`cleaned up ${ids.length} users`);
    }

    if (failures) {
        console.error(`${failures} RLS assertion(s) failed`);
        process.exit(1);
    }
    console.log('RLS check green');
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
