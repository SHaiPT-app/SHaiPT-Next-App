/**
 * Turn waitlist rows into invitations — the spout on the bucket /waitlist fills.
 *
 *   pnpm waitlist:invite                     show who is next, change nothing (default)
 *   pnpm waitlist:invite -- --send           actually invite the next 25
 *   pnpm waitlist:invite -- --send --limit 5 invite the next 5
 *   pnpm waitlist:invite -- --stats          counts by campaign, invite nothing
 *
 * What an invitation is: a row in `invites` for that address. The sign-up form refuses any email
 * without one (app/api/invites/check), so writing the row is what actually opens the door — the
 * mail is only how the person finds out. We deliberately do NOT create the account or generate a
 * password the way scripts/create-test-users.ts does: mailing people passwords is a bad habit, and
 * at waitlist volume it is also a support burden. They sign up themselves and choose their own.
 *
 * Oldest first, because that is the only ordering a person who waited can check you kept.
 *
 * Mail goes through Resend (provisioned via the Vercel marketplace; RESEND_API_KEY arrives with
 * `vercel env pull`). Without the key the script still writes the invite rows and prints the
 * addresses for you to mail by hand, because a half-open door is worse than a slow one — it would
 * leave people invited in the database and never told.
 *
 * `invited_at` is stamped only after the mail is actually accepted by Resend, so a failure midway
 * leaves the rest of the batch genuinely pending and a re-run picks them up. The invite row is
 * upserted first and is harmless on its own.
 */
import { adminClient, hasFlag, loadEnvLocal } from './db';

const SITE = 'https://www.shaipt.com';
const SIGNUP_URL = `${SITE}/login`;
/** Matches the sending domain provisioned on the Resend integration. */
const FROM = 'SHaiPT <hello@send.shaipt.com>';
const DEFAULT_LIMIT = 25;

interface WaitlistRow {
    id: string;
    email: string;
    utm_source: string | null;
    utm_campaign: string | null;
    created_at: string;
}

/** The value after a flag, when it takes one. */
function flagValue(flag: string): string | null {
    const i = process.argv.indexOf(flag);
    if (i === -1) return null;
    const value = process.argv[i + 1];
    if (!value || value.startsWith('--')) {
        console.error(`${flag} needs a value`);
        process.exit(2);
    }
    return value;
}

function inviteEmail(email: string): { subject: string; html: string; text: string } {
    const subject = 'Your SHaiPT place is open';
    const text = [
        'Your place on the SHaiPT waitlist is open.',
        '',
        `Sign up here: ${SIGNUP_URL}`,
        '',
        `Use this address — ${email} — it is the one that has been let through.`,
        '',
        'Film one set on your phone and you get a 4D replay you can walk around, with reps,',
        'tempo and a technique score in plain words.',
        '',
        'If you did not ask for this, ignore it and nothing happens.',
    ].join('\n');

    /* Deliberately plain HTML: inline styles only, no external CSS or images, a table-free single
       column. Mail clients strip everything else, and a transactional mail that renders as a blank
       box in Outlook is a lead lost at the last step. */
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <p style="margin:0 0 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#da0023;">SHaiPT</p>
  <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:600;">Your place is open.</h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Film one set on your phone and get a 4D replay you can walk around &mdash; reps, tempo and a technique score in plain words.</p>
  <p style="margin:0 0 28px;font-size:15px;line-height:1.6;">Sign up with <strong>${email}</strong>, the address that has been let through.</p>
  <p style="margin:0 0 32px;"><a href="${SIGNUP_URL}" style="display:inline-block;background:#da0023;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:15px;font-weight:600;">Create your account</a></p>
  <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#666;">Or paste this into your browser:<br><a href="${SIGNUP_URL}" style="color:#da0023;">${SIGNUP_URL}</a></p>
  <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e0e0e0;font-size:12px;line-height:1.6;color:#888;">You asked for early access at shaipt.com. If that was not you, ignore this and nothing happens.</p>
</div></body></html>`;

    return { subject, html, text };
}

async function sendViaResend(apiKey: string, to: string): Promise<string | null> {
    const { subject, html, text } = inviteEmail(to);
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to, subject, html, text }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        return `HTTP ${response.status} ${body.slice(0, 200)}`;
    }
    return null;
}

async function stats(admin: ReturnType<typeof adminClient>) {
    const { data } = await admin.from('waitlist').select('utm_source,utm_campaign,invited_at');
    const rows = data ?? [];
    const pending = rows.filter((r) => !r.invited_at).length;
    console.log(`waitlist: ${rows.length} total, ${pending} waiting, ${rows.length - pending} invited\n`);
    if (rows.length === 0) return;

    const byCampaign = new Map<string, number>();
    for (const r of rows) {
        const key = `${r.utm_source ?? 'organic'} / ${r.utm_campaign ?? '—'}`;
        byCampaign.set(key, (byCampaign.get(key) ?? 0) + 1);
    }
    console.log('source / campaign'.padEnd(44) + 'signups');
    for (const [key, n] of [...byCampaign].sort((a, b) => b[1] - a[1])) {
        console.log(key.padEnd(44) + String(n));
    }
}

async function main() {
    loadEnvLocal();
    const admin = adminClient();

    if (hasFlag('--stats')) {
        await stats(admin);
        return;
    }

    const limit = Number(flagValue('--limit') ?? DEFAULT_LIMIT);
    if (!Number.isInteger(limit) || limit < 1) {
        console.error('--limit needs a positive whole number');
        process.exit(2);
    }
    const send = hasFlag('--send');

    const { data, error } = await admin
        .from('waitlist')
        .select('id,email,utm_source,utm_campaign,created_at')
        .is('invited_at', null)
        .order('created_at', { ascending: true })
        .limit(limit);
    if (error) {
        console.error(`Could not read the waitlist: ${error.message}`);
        process.exit(1);
    }

    const queue = (data ?? []) as WaitlistRow[];
    if (queue.length === 0) {
        console.log('Nobody is waiting.');
        return;
    }

    if (!send) {
        console.log(`Next ${queue.length} in line (nothing sent — add --send to invite them):\n`);
        for (const row of queue) {
            const from = row.utm_campaign ? `${row.utm_source ?? '?'}/${row.utm_campaign}` : 'organic';
            console.log(`  ${row.email.padEnd(36)} ${row.created_at.slice(0, 10)}  ${from}`);
        }
        console.log(`\n  pnpm waitlist:invite -- --send --limit ${queue.length}`);
        return;
    }

    const apiKey = process.env.RESEND_API_KEY ?? '';
    if (!apiKey) {
        console.warn('RESEND_API_KEY is not set — writing invite rows but sending no mail.');
        console.warn('Run `vercel env pull` once the Resend integration is installed.\n');
    }

    let invited = 0;
    let mailed = 0;
    const unmailed: string[] = [];

    for (const row of queue) {
        // The invite row is what opens the door. Harmless on its own, so it goes first: if the
        // mail then fails, the person is let in and merely uninformed, which a re-run fixes.
        const { error: inviteError } = await admin
            .from('invites')
            .upsert(
                { email: row.email, role: 'trainee', note: `waitlist ${row.created_at.slice(0, 10)}` },
                { onConflict: 'email' },
            );
        if (inviteError) {
            console.log(`  ${row.email}: FAILED to write invite (${inviteError.message})`);
            continue;
        }
        invited += 1;

        if (!apiKey) {
            unmailed.push(row.email);
            continue;
        }

        const failure = await sendViaResend(apiKey, row.email);
        if (failure) {
            console.log(`  ${row.email}: invited, but the mail failed (${failure})`);
            continue;
        }

        // Only now is this person genuinely handled, so only now do they leave the queue.
        await admin.from('waitlist').update({ invited_at: new Date().toISOString() }).eq('id', row.id);
        mailed += 1;
        console.log(`  ${row.email}: invited and mailed`);
    }

    console.log(`\n${invited} invite row(s) written, ${mailed} mailed.`);
    if (unmailed.length > 0) {
        console.log('\nMail these people yourself — they are let in but have not been told:');
        for (const email of unmailed) console.log(`  ${email}`);
        console.log(`\nThe link they need: ${SIGNUP_URL}`);
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
