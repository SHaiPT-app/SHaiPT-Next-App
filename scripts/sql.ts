/** Ad-hoc SQL against the project:  pnpm db:sql "select count(*) from exercises" */
import { loadEnvLocal } from './db';
loadEnvLocal();
import postgres from 'postgres';

async function main() {
    const url = process.env.SUPABASE_DB_URL;
    if (!url) throw new Error('SUPABASE_DB_URL missing');
    const sql = postgres(url, { ssl: 'require', max: 1 });
    try {
        const rows = await sql.unsafe(process.argv.slice(2).join(' '));
        console.log(JSON.stringify(rows, null, 1));
    } finally {
        await sql.end();
    }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
