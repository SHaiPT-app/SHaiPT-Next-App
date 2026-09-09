/**
 * Create tester accounts (service role). Prints each password once; never stores it.
 *
 *   pnpm db:test-users -- friend@example.com other@example.com
 *   pnpm db:test-users -- --trainer coach@example.com
 *   pnpm db:test-users -- --revoke friend@example.com      delete the account and its data
 *   pnpm db:test-users -- --reset friend@example.com       new password, same account
 *   pnpm db:test-users -- --password 'chosen-one' friend@example.com    set it yourself
 *
 * Without --password the script generates one and prints it once. A password you choose is
 * only as good as you make it: these accounts are real sign-ins on the live project.
 *
 * Each account: email confirmed, an `invites` row (so the sign-up path is on record), the
 * profile marked tester = true, role trainee (or trainer with --trainer), a `user_preferences`
 * row. Testers get full feature access through profiles.tester (lib/requireSubscription.ts),
 * never through Stripe.
 */
import { randomBytes } from 'node:crypto';
import { adminClient, hasFlag } from './db';

/** The value after --password, when the caller wants a specific one. */
function chosenPassword(): string | null {
    const i = process.argv.indexOf('--password');
    const value = i === -1 ? undefined : process.argv[i + 1];
    if (i !== -1 && (!value || value.startsWith('--'))) {
        console.error('--password needs a value');
        process.exit(2);
    }
    return value ?? null;
}

function password(): string {
    // 16 chars, mixed, readable: no 0/O/l/1 confusion
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(16);
    let out = '';
    for (const b of bytes) out += alphabet[b % alphabet.length];
    return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

async function main() {
    const admin = adminClient();
    const role: 'trainee' | 'trainer' = hasFlag('--trainer') ? 'trainer' : 'trainee';
    const chosen = chosenPassword();
    const newPassword = () => chosen ?? password();
    // drop the flags and, when it is there, the value that follows --password
    const args = process.argv.slice(2);
    const passwordValueIndex = chosen === null ? -1 : args.indexOf('--password') + 1;
    const emails = args
        .filter((a, i) => !a.startsWith('--') && i !== passwordValueIndex)
        .map((e) => e.trim().toLowerCase());
    if (emails.length === 0) {
        console.error('usage: pnpm db:test-users -- [--trainer|--revoke|--reset] email [email…]');
        process.exit(2);
    }

    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const byEmail = new Map((list?.users ?? []).map((u) => [u.email?.toLowerCase() ?? '', u]));

    for (const email of emails) {
        const existing = byEmail.get(email);

        if (hasFlag('--revoke')) {
            if (!existing) { console.log(`${email}: no such user`); continue; }
            const { error } = await admin.auth.admin.deleteUser(existing.id);
            await admin.from('invites').delete().ilike('email', email);
            console.log(`${email}: ${error ? `FAILED (${error.message})` : 'deleted with all their rows (cascade)'}`);
            continue;
        }

        if (hasFlag('--reset')) {
            if (!existing) { console.log(`${email}: no such user`); continue; }
            const pw = newPassword();
            const { error } = await admin.auth.admin.updateUserById(existing.id, { password: pw });
            console.log(`${email}: ${error ? `FAILED (${error.message})` : `new password ${pw}`}`);
            continue;
        }

        if (existing) { console.log(`${email}: already exists (use --reset for a new password)`); continue; }

        await admin.from('invites').upsert({ email, role, note: 'created by scripts/create-test-users.ts' }, { onConflict: 'email' }).select();
        const pw = newPassword();
        const { data, error } = await admin.auth.admin.createUser({
            email,
            password: pw,
            email_confirm: true,
            user_metadata: { full_name: email.split('@')[0], role },
        });
        if (error || !data.user) { console.log(`${email}: FAILED (${error?.message})`); continue; }

        // the trigger has created the profile; make sure the tester bits are set even if the
        // invite lookup did not match (e.g. mixed case)
        await admin.from('profiles').update({ role, tester: true }).eq('id', data.user.id);
        await admin.from('user_preferences').upsert({ user_id: data.user.id }, { onConflict: 'user_id' });
        console.log(`${email}: created as ${role}\n    password: ${pw}\n    id: ${data.user.id}`);
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
