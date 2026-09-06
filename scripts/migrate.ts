/**
 * Apply supabase/migrations/*.sql in file-name order against SUPABASE_DB_URL.
 *
 *   pnpm db:migrate                 apply every migration not yet recorded in public.schema_migrations
 *   pnpm db:migrate -- --status     list applied / pending, change nothing
 *   pnpm db:migrate -- --force      re-run every file (they are all idempotent)
 *   pnpm db:migrate -- --auth-stub  first apply scripts/local/auth-stub.sql (local docker Postgres only)
 *
 * Each file runs inside its own transaction. The migrations are written to be re-runnable
 * (IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS … CREATE POLICY), so re-applying a
 * file after editing it is safe: `--force` or delete its row from schema_migrations.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pgClient, hasFlag, REPO_ROOT } from './db';

const MIGRATIONS_DIR = resolve(REPO_ROOT, 'supabase/migrations');

async function main() {
    const sql = pgClient();
    const status = hasFlag('--status');
    const force = hasFlag('--force');

    try {
        if (hasFlag('--auth-stub')) {
            const stub = readFileSync(resolve(REPO_ROOT, 'scripts/local/auth-stub.sql'), 'utf8');
            await sql.unsafe(stub);
            console.log('applied scripts/local/auth-stub.sql (local Postgres only)');
        }

        await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                name text PRIMARY KEY,
                checksum text NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            );
            ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;`);

        const applied = new Map<string, string>();
        for (const row of await sql`SELECT name, checksum FROM public.schema_migrations`) {
            applied.set(row.name as string, row.checksum as string);
        }

        const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
        let ran = 0;
        for (const name of files) {
            const body = readFileSync(resolve(MIGRATIONS_DIR, name), 'utf8');
            const checksum = createHash('sha256').update(body).digest('hex').slice(0, 16);
            const before = applied.get(name);
            const changed = before !== undefined && before !== checksum;

            if (status) {
                console.log(`${before ? (changed ? 'CHANGED' : 'applied') : 'pending'}  ${name}`);
                continue;
            }
            if (before && !changed && !force) continue;

            process.stdout.write(`${before ? 're-applying' : 'applying'} ${name} … `);
            const started = Date.now();
            try {
                await sql.begin(async (tx) => {
                    await tx.unsafe(body);
                    await tx`
                        INSERT INTO public.schema_migrations (name, checksum)
                        VALUES (${name}, ${checksum})
                        ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now()`;
                });
            } catch (err) {
                console.log('FAILED');
                console.error(err instanceof Error ? err.message : err);
                process.exitCode = 1;
                return;
            }
            console.log(`ok (${Date.now() - started} ms)`);
            ran++;
        }
        if (!status) console.log(ran === 0 ? 'nothing to apply' : `${ran} migration(s) applied`);
    } finally {
        await sql.end();
    }
}

main();
