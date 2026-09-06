/**
 * Shared helpers for the database scripts (migrate, seed, rls-check, create-test-users).
 *
 * Two ways in:
 *   - SUPABASE_DB_URL: the Postgres connection string from Supabase → Project Settings → Database
 *     (use the "Transaction" pooler URI on port 6543, or the direct one on 5432). Used by the
 *     migration runner and the local docker checks.
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY: the
 *     HTTP API, used by the seeders, the RLS check and the test-user script.
 *
 * `.env.local` is loaded automatically (no dotenv dependency: Next.js reads it, so do we).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const REPO_ROOT = resolve(__dirname, '..');

export function loadEnvLocal(): void {
    const file = resolve(REPO_ROOT, '.env.local');
    if (!existsSync(file)) return;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(`Missing ${name}. Add it to .env.local or export it before running this script.`);
        process.exit(2);
    }
    return value;
}

/** Postgres connection from SUPABASE_DB_URL. */
export function pgClient(): postgres.Sql {
    loadEnvLocal();
    const url = requireEnv('SUPABASE_DB_URL');
    return postgres(url, {
        max: 1,
        // Supabase's pooler wants no prepared statements in transaction mode.
        prepare: false,
        onnotice: () => {},
    });
}

/** Supabase client with the service role key (bypasses RLS). Server-side scripts only. */
export function adminClient(): SupabaseClient {
    loadEnvLocal();
    return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** Supabase client with the anon key, optionally acting as a signed-in user. */
export function anonClient(accessToken?: string): SupabaseClient {
    loadEnvLocal();
    return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
        auth: { autoRefreshToken: false, persistSession: false },
        global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });
}

export function arg(flag: string): string | undefined {
    const i = process.argv.indexOf(flag);
    if (i < 0) return undefined;
    return process.argv[i + 1] ?? '';
}

export function hasFlag(flag: string): boolean {
    return process.argv.includes(flag);
}
