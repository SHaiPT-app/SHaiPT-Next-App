/**
 * Three tiny live calls through the AI gateway (a fraction of a cent) to prove the key, the
 * models and the JSON mode work:  pnpm ai:smoke
 * Skips the limit check and does not need the database (usage logging fails quietly without it).
 */
import { loadEnvLocal } from './db';
loadEnvLocal();
import { z } from 'zod';
import { callModel, streamModel, CHEAP_MODEL, STRONG_MODEL } from '../lib/ai/gateway';

async function main() {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing in .env.local');
    console.log(`models: cheap=${CHEAP_MODEL} strong=${STRONG_MODEL}`);
    const a = await callModel({ userId: null, feature: 'chat', prompt: 'Reply with exactly three words.', unmetered: true });
    console.log('chat   :', JSON.stringify(a.text), a.model, a.usage);
    const b = await callModel({
        userId: null, feature: 'plan', prompt: 'Give daily macro targets for an 80 kg man building muscle.',
        schema: z.object({ daily_calories: z.number(), protein_g: z.number() }), unmetered: true, cacheHours: 0,
    });
    console.log('json   :', b.json, b.model, b.usage);
    const { stream, done } = await streamModel({ userId: null, feature: 'chat', messages: [{ role: 'user', content: 'Count to five, digits only.' }], unmetered: true });
    const reader = stream.getReader();
    let out = '';
    for (;;) { const { value, done: d } = await reader.read(); if (d) break; out += new TextDecoder().decode(value); }
    const r = await done;
    console.log('stream :', JSON.stringify(out), r.usage);
    console.log(`total cost: $${(a.usage.costUsd + b.usage.costUsd + r.usage.costUsd).toFixed(6)}`);
}

main().catch((e: { status?: number; message?: string }) => { console.error('FAILED', e?.status ?? '', e?.message ?? e); process.exit(1); });
