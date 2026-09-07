/**
 * The one door to the model. Every Gemini call in the app goes through callModel / streamModel:
 *
 *   - model policy per feature (cheap flash-lite for chat, flash for plan generation)
 *   - a hard maxOutputTokens on every call
 *   - per-user daily limits and a global monthly budget, checked BEFORE the call (429 when hit)
 *   - a usage row per call (ai_usage → ai_budget by trigger) from usageMetadata
 *   - a 24 h response cache for deterministic generations (ai_cache, keyed by a prompt hash)
 *   - JSON mode with a zod schema, validated again on the way out
 *   - a mock mode (no GEMINI_API_KEY outside production, or AI_MOCK=1) for tests and CI
 *
 * Nothing here trusts the caller for identity: pass the user id from lib/auth.
 */
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type Content, type GenerationConfig, type ResponseSchema } from '@google/generative-ai';
import { z, type ZodType } from 'zod';
import { getAdmin } from '@/lib/auth';
import { estimateCost } from './prices';

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export type Feature =
    | 'chat' | 'interview' | 'dietitian_interview' | 'onboarding_chat'
    | 'workout_summary' | 'weekly_insights' | 'workout_tips'
    | 'plan' | 'nutrition' | 'macro_targets' | 'diet' | 'grocery' | 'plan_adaptation'
    | 'photo_assessment';

export const CHEAP_MODEL = process.env.AI_MODEL_CHEAP || 'gemini-2.5-flash-lite';
export const STRONG_MODEL = process.env.AI_MODEL_STRONG || 'gemini-2.5-flash';

interface Policy {
    model: string;
    maxOutputTokens: number;
    temperature: number;
    /** cache identical prompts for this many hours (0 = never) */
    cacheHours: number;
    /** only test accounts and pro/elite may use it */
    premium?: boolean;
}

export const POLICY: Record<Feature, Policy> = {
    chat: { model: CHEAP_MODEL, maxOutputTokens: 600, temperature: 0.7, cacheHours: 0 },
    interview: { model: CHEAP_MODEL, maxOutputTokens: 600, temperature: 0.7, cacheHours: 0 },
    dietitian_interview: { model: CHEAP_MODEL, maxOutputTokens: 600, temperature: 0.7, cacheHours: 0 },
    onboarding_chat: { model: CHEAP_MODEL, maxOutputTokens: 600, temperature: 0.7, cacheHours: 0 },
    workout_summary: { model: CHEAP_MODEL, maxOutputTokens: 400, temperature: 0.6, cacheHours: 24 },
    weekly_insights: { model: CHEAP_MODEL, maxOutputTokens: 800, temperature: 0.5, cacheHours: 24 * 7 },
    workout_tips: { model: CHEAP_MODEL, maxOutputTokens: 400, temperature: 0.6, cacheHours: 24 },
    plan: { model: STRONG_MODEL, maxOutputTokens: 4000, temperature: 0.4, cacheHours: 24 },
    nutrition: { model: STRONG_MODEL, maxOutputTokens: 3000, temperature: 0.4, cacheHours: 24 },
    macro_targets: { model: CHEAP_MODEL, maxOutputTokens: 400, temperature: 0.2, cacheHours: 24 },
    diet: { model: STRONG_MODEL, maxOutputTokens: 3000, temperature: 0.4, cacheHours: 24 },
    grocery: { model: CHEAP_MODEL, maxOutputTokens: 1500, temperature: 0.3, cacheHours: 24 },
    plan_adaptation: { model: STRONG_MODEL, maxOutputTokens: 1500, temperature: 0.4, cacheHours: 24 },
    photo_assessment: { model: STRONG_MODEL, maxOutputTokens: 800, temperature: 0.4, cacheHours: 0, premium: true },
};

export const LIMITS = {
    dailyCallsPerUser: Number(process.env.AI_DAILY_CALLS_PER_USER || 40),
    dailyTokensPerUser: Number(process.env.AI_DAILY_TOKENS_PER_USER || 200_000),
    monthlyCapUsd: Number(process.env.AI_MONTHLY_CAP_USD || 15),
    /** chat history sent to the model, in turns */
    chatHistoryTurns: 12,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CallOptions<T = unknown> {
    /** the caller (from lib/auth); null only for unattended batch jobs */
    userId: string | null;
    feature: Feature;
    /** one-shot prompt … */
    prompt?: string;
    /** … or a conversation (the last message is the one being answered) */
    messages?: ChatMessage[];
    system?: string;
    /** JSON mode: the model must return an object matching this schema */
    schema?: ZodType<T>;
    maxOutputTokens?: number;
    temperature?: number;
    model?: string;
    /** override the policy's cache hours (0 disables) */
    cacheHours?: number;
    /** inline images (photo assessment): base64 data + mime type */
    images?: Array<{ data: string; mimeType: string }>;
    /** what to return when the model is mocked (no key outside production, or AI_MOCK=1) */
    mock?: () => T | string;
    /** skip the limit check (only for the admin/cron path) */
    unmetered?: boolean;
}

export interface Usage {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    costUsd: number;
}

export interface CallResult<T = unknown> {
    text: string;
    json?: T;
    usage: Usage;
    model: string;
    cached: boolean;
    mocked: boolean;
}

export class AiLimitError extends Error {
    status = 429;
    constructor(message: string, public reason: 'daily_calls' | 'daily_tokens' | 'monthly_budget' | 'premium') {
        super(message);
    }
}

export class AiUnavailableError extends Error {
    status = 503;
}

export function limitResponse(err: unknown): NextResponse | null {
    if (err instanceof AiLimitError) {
        return NextResponse.json({ error: err.message, reason: err.reason }, { status: 429 });
    }
    if (err instanceof AiUnavailableError) {
        return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return null;
}

// ---------------------------------------------------------------------------
// Limits and bookkeeping
// ---------------------------------------------------------------------------

export function currentMonth(now = new Date()): string {
    return now.toISOString().slice(0, 7);
}

/** Throws AiLimitError when the user or the app is over its limits. */
export async function checkLimits(userId: string | null, feature: Feature, tester = false): Promise<void> {
    const admin = getAdmin();
    const policy = POLICY[feature];
    if (policy.premium && !tester) {
        throw new AiLimitError('This feature is available to test accounts and Pro members.', 'premium');
    }

    const { data: budget } = await admin
        .from('ai_budget')
        .select('spent_usd, cap_usd')
        .eq('month', currentMonth())
        .maybeSingle();
    // the env cap wins over the row (the row only remembers what the cap was)
    const cap = process.env.AI_MONTHLY_CAP_USD ? LIMITS.monthlyCapUsd : Number(budget?.cap_usd ?? LIMITS.monthlyCapUsd);
    if (budget && Number(budget.spent_usd) >= cap) {
        throw new AiLimitError(
            "The AI coach has reached this month's budget and is taking a break. Workout logging and everything else keeps working.",
            'monthly_budget'
        );
    }

    if (userId) {
        const { data } = await admin.rpc('ai_usage_today', { p_user_id: userId });
        const row = Array.isArray(data) ? data[0] : data;
        const calls = Number(row?.calls ?? 0);
        const tokens = Number(row?.tokens ?? 0);
        if (calls >= LIMITS.dailyCallsPerUser) {
            throw new AiLimitError(
                `You've used today's ${LIMITS.dailyCallsPerUser} AI messages. The coach is back tomorrow.`,
                'daily_calls'
            );
        }
        if (tokens >= LIMITS.dailyTokensPerUser) {
            throw new AiLimitError("You've hit today's AI limit. The coach is back tomorrow.", 'daily_tokens');
        }
    }
}

async function logUsage(row: {
    userId: string | null; feature: Feature; model: string; usage: Usage; cacheHit: boolean;
    status: string; latencyMs: number;
}): Promise<void> {
    try {
        await getAdmin().from('ai_usage').insert({
            user_id: row.userId,
            feature: row.feature,
            model: row.model,
            input_tokens: row.usage.inputTokens,
            output_tokens: row.usage.outputTokens,
            cached_tokens: row.usage.cachedTokens,
            cost_usd: row.usage.costUsd,
            cache_hit: row.cacheHit,
            status: row.status,
            latency_ms: row.latencyMs,
        });
    } catch (err) {
        console.error('[ai] usage log failed', err instanceof Error ? err.message : err);
    }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

function cacheKey(parts: unknown[]): string {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

async function cacheGet(key: string): Promise<{ response: { text: string; json?: unknown }; input_tokens: number; output_tokens: number } | null> {
    try {
        const { data } = await getAdmin()
            .from('ai_cache')
            .select('response, input_tokens, output_tokens, expires_at, hits')
            .eq('key', key)
            .maybeSingle();
        if (!data || new Date(data.expires_at) < new Date()) return null;
        void getAdmin().from('ai_cache').update({ hits: (data.hits ?? 0) + 1 }).eq('key', key).then(() => undefined, () => undefined);
        return data as { response: { text: string; json?: unknown }; input_tokens: number; output_tokens: number };
    } catch {
        return null;
    }
}

async function cacheSet(key: string, feature: Feature, model: string, response: { text: string; json?: unknown }, usage: Usage, hours: number): Promise<void> {
    try {
        await getAdmin().from('ai_cache').upsert({
            key,
            feature,
            model,
            response,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        }, { onConflict: 'key' });
    } catch (err) {
        console.error('[ai] cache write failed', err instanceof Error ? err.message : err);
    }
}

// ---------------------------------------------------------------------------
// Schema → Gemini responseSchema (OpenAPI subset)
// ---------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;

function toGeminiSchema(node: unknown): JsonSchema {
    if (!node || typeof node !== 'object') return {};
    const src = node as JsonSchema;
    const out: JsonSchema = {};
    let type = src.type;
    let nullable = false;
    if (Array.isArray(type)) {
        nullable = type.includes('null');
        type = type.filter((t) => t !== 'null')[0] ?? 'string';
    }
    if (Array.isArray(src.anyOf)) {
        const options = (src.anyOf as JsonSchema[]).filter((o) => o.type !== 'null');
        nullable = options.length < (src.anyOf as JsonSchema[]).length;
        if (options.length === 1) return { ...toGeminiSchema(options[0]), ...(nullable ? { nullable: true } : {}) };
    }
    if (type) out.type = type;
    if (nullable) out.nullable = true;
    if (typeof src.description === 'string') out.description = src.description;
    if (Array.isArray(src.enum)) out.enum = src.enum;
    if (src.properties && typeof src.properties === 'object') {
        out.properties = Object.fromEntries(
            Object.entries(src.properties as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v)])
        );
    }
    if (Array.isArray(src.required)) out.required = src.required;
    if (src.items) out.items = toGeminiSchema(src.items);
    return out;
}

export function geminiSchema(schema: ZodType): ResponseSchema {
    return toGeminiSchema(z.toJSONSchema(schema)) as unknown as ResponseSchema;
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

export function trimHistory(messages: ChatMessage[], turns = LIMITS.chatHistoryTurns): ChatMessage[] {
    const conversation = messages.filter((m) => m.role !== 'system');
    return conversation.slice(-turns);
}

function toContents(opts: CallOptions): Content[] {
    const contents: Content[] = [];
    if (opts.messages?.length) {
        for (const m of trimHistory(opts.messages)) {
            contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
        }
    }
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
    if (opts.prompt) parts.push({ text: opts.prompt });
    for (const img of opts.images ?? []) parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
    if (parts.length) contents.push({ role: 'user', parts });
    if (contents.length === 0) throw new Error('callModel needs a prompt or messages');
    // Gemini wants the conversation to start with a user turn
    if (contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(conversation start)' }] });
    return contents;
}

function isMocked(): boolean {
    if (process.env.AI_MOCK === '1') return true;
    return !process.env.GEMINI_API_KEY && process.env.NODE_ENV !== 'production';
}

function extractJson(text: string): unknown {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.search(/[[{]/);
        const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
        if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
        throw new Error('model returned no JSON');
    }
}

function usageFrom(model: string, meta?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number; thoughtsTokenCount?: number }): Usage {
    const inputTokens = meta?.promptTokenCount ?? 0;
    const outputTokens = (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
    const cachedTokens = meta?.cachedContentTokenCount ?? 0;
    return { inputTokens, outputTokens, cachedTokens, costUsd: estimateCost(model, inputTokens, outputTokens, cachedTokens) };
}

const ZERO: Usage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };

// ---------------------------------------------------------------------------
// callModel
// ---------------------------------------------------------------------------

/**
 * One model call. Returns text, or validated JSON when `schema` is given.
 * Throws AiLimitError (429) before spending anything when a limit is hit.
 */
export async function callModel<T = unknown>(opts: CallOptions<T> & { tester?: boolean }): Promise<CallResult<T>> {
    const policy = POLICY[opts.feature];
    const model = opts.model ?? policy.model;
    const maxOutputTokens = Math.min(opts.maxOutputTokens ?? policy.maxOutputTokens, 8192);
    const temperature = opts.temperature ?? policy.temperature;
    const cacheHours = opts.cacheHours ?? policy.cacheHours;
    const started = Date.now();

    if (!opts.unmetered) await checkLimits(opts.userId, opts.feature, opts.tester);

    // cache: only for deterministic one-shot generations
    const key = cacheHours > 0 && !opts.images
        ? cacheKey([model, opts.system ?? '', opts.prompt ?? '', opts.messages ?? [], opts.schema ? 'json' : 'text'])
        : null;
    if (key) {
        const hit = await cacheGet(key);
        if (hit) {
            await logUsage({ userId: opts.userId, feature: opts.feature, model, usage: ZERO, cacheHit: true, status: 'cache', latencyMs: Date.now() - started });
            return { text: hit.response.text, json: hit.response.json as T, usage: ZERO, model, cached: true, mocked: false };
        }
    }

    if (isMocked()) {
        if (!opts.mock) throw new AiUnavailableError('AI is not configured (GEMINI_API_KEY missing) and no mock was provided.');
        const value = opts.mock();
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        const json = opts.schema ? opts.schema.parse(typeof value === 'string' ? extractJson(value) : value) : undefined;
        await logUsage({ userId: opts.userId, feature: opts.feature, model: 'mock', usage: ZERO, cacheHit: false, status: 'mock', latencyMs: 0 });
        return { text, json, usage: ZERO, model: 'mock', cached: false, mocked: true };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiUnavailableError('AI is not configured.');

    const generationConfig: GenerationConfig = { maxOutputTokens, temperature };
    if (opts.schema) {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.responseSchema = geminiSchema(opts.schema);
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const gm = genAI.getGenerativeModel({ model, generationConfig, systemInstruction: opts.system || undefined });
    const contents = toContents(opts);

    let text = '';
    let usage = ZERO;
    let json: T | undefined;
    try {
        const result = await gm.generateContent({ contents });
        text = result.response.text();
        usage = usageFrom(model, result.response.usageMetadata);
        if (opts.schema) {
            try {
                json = opts.schema.parse(extractJson(text));
            } catch (parseErr) {
                // one repair attempt: ask the model to return only the JSON
                const repair = await gm.generateContent({
                    contents: [...contents, { role: 'model', parts: [{ text }] }, { role: 'user', parts: [{ text: 'That was not valid JSON for the schema. Return only the corrected JSON object.' }] }],
                });
                const repairedText = repair.response.text();
                const u2 = usageFrom(model, repair.response.usageMetadata);
                usage = { inputTokens: usage.inputTokens + u2.inputTokens, outputTokens: usage.outputTokens + u2.outputTokens, cachedTokens: usage.cachedTokens + u2.cachedTokens, costUsd: usage.costUsd + u2.costUsd };
                try {
                    json = opts.schema.parse(extractJson(repairedText));
                    text = repairedText;
                } catch {
                    await logUsage({ userId: opts.userId, feature: opts.feature, model, usage, cacheHit: false, status: 'invalid_json', latencyMs: Date.now() - started });
                    throw parseErr;
                }
            }
        }
    } catch (err) {
        if (!(err instanceof z.ZodError)) {
            await logUsage({ userId: opts.userId, feature: opts.feature, model, usage, cacheHit: false, status: 'error', latencyMs: Date.now() - started });
        }
        throw err;
    }

    await logUsage({ userId: opts.userId, feature: opts.feature, model, usage, cacheHit: false, status: 'ok', latencyMs: Date.now() - started });
    if (key) await cacheSet(key, opts.feature, model, { text, json }, usage, cacheHours);
    return { text, json, usage, model, cached: false, mocked: false };
}

// ---------------------------------------------------------------------------
// streamModel (chat)
// ---------------------------------------------------------------------------

export interface StreamResult {
    /** text/plain chunks for the HTTP response */
    stream: ReadableStream<Uint8Array>;
    /** resolves when the model is done, with the full text and the usage row already logged */
    done: Promise<{ text: string; usage: Usage; model: string; mocked: boolean }>;
}

/** Streamed text reply. Limits are checked before the first byte. */
export async function streamModel(opts: CallOptions & { tester?: boolean }): Promise<StreamResult> {
    const policy = POLICY[opts.feature];
    const model = opts.model ?? policy.model;
    const maxOutputTokens = Math.min(opts.maxOutputTokens ?? policy.maxOutputTokens, 8192);
    const temperature = opts.temperature ?? policy.temperature;
    const started = Date.now();
    const encoder = new TextEncoder();

    if (!opts.unmetered) await checkLimits(opts.userId, opts.feature, opts.tester);

    if (isMocked()) {
        if (!opts.mock) throw new AiUnavailableError('AI is not configured (GEMINI_API_KEY missing) and no mock was provided.');
        const value = opts.mock();
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        let resolveDone!: (v: { text: string; usage: Usage; model: string; mocked: boolean }) => void;
        const done = new Promise<{ text: string; usage: Usage; model: string; mocked: boolean }>((r) => { resolveDone = r; });
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                for (const word of text.split(' ')) {
                    controller.enqueue(encoder.encode(word + ' '));
                    await new Promise((r) => setTimeout(r, 15));
                }
                controller.close();
                await logUsage({ userId: opts.userId, feature: opts.feature, model: 'mock', usage: ZERO, cacheHit: false, status: 'mock', latencyMs: Date.now() - started });
                resolveDone({ text, usage: ZERO, model: 'mock', mocked: true });
            },
        });
        return { stream, done };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiUnavailableError('AI is not configured.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const gm = genAI.getGenerativeModel({
        model,
        generationConfig: { maxOutputTokens, temperature },
        systemInstruction: opts.system || undefined,
    });
    const contents = toContents(opts);
    const result = await gm.generateContentStream({ contents });

    let resolveDone!: (v: { text: string; usage: Usage; model: string; mocked: boolean }) => void;
    let rejectDone!: (e: unknown) => void;
    const done = new Promise<{ text: string; usage: Usage; model: string; mocked: boolean }>((res, rej) => { resolveDone = res; rejectDone = rej; });

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let text = '';
            try {
                for await (const chunk of result.stream) {
                    const piece = chunk.text();
                    if (piece) {
                        text += piece;
                        controller.enqueue(encoder.encode(piece));
                    }
                }
                controller.close();
                const response = await result.response;
                const usage = usageFrom(model, response.usageMetadata);
                await logUsage({ userId: opts.userId, feature: opts.feature, model, usage, cacheHit: false, status: 'ok', latencyMs: Date.now() - started });
                resolveDone({ text, usage, model, mocked: false });
            } catch (err) {
                controller.error(err);
                await logUsage({ userId: opts.userId, feature: opts.feature, model, usage: ZERO, cacheHit: false, status: 'error', latencyMs: Date.now() - started });
                rejectDone(err);
            }
        },
    });
    return { stream, done };
}

// ---------------------------------------------------------------------------
// Reporting (for /api/admin/usage)
// ---------------------------------------------------------------------------

export interface UsageReport {
    month: string;
    spentUsd: number;
    capUsd: number;
    calls: number;
    byFeature: Array<{ feature: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }>;
    byUser: Array<{ userId: string | null; email: string | null; calls: number; costUsd: number }>;
    today: { calls: number; costUsd: number };
}

export async function usageReport(month = currentMonth()): Promise<UsageReport> {
    const admin = getAdmin();
    const from = `${month}-01T00:00:00Z`;
    const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString();
    const [{ data: budget }, { data: rows }] = await Promise.all([
        admin.from('ai_budget').select('spent_usd, cap_usd, calls').eq('month', month).maybeSingle(),
        admin.from('ai_usage').select('user_id, feature, input_tokens, output_tokens, cost_usd, cache_hit, created_at')
            .gte('created_at', from).lt('created_at', next).limit(20000),
    ]);
    const byFeature = new Map<string, { feature: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }>();
    const byUser = new Map<string, { userId: string | null; email: string | null; calls: number; costUsd: number }>();
    const todayStart = new Date().toISOString().slice(0, 10);
    const today = { calls: 0, costUsd: 0 };
    for (const r of rows ?? []) {
        const f = byFeature.get(r.feature) ?? { feature: r.feature, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
        f.calls++; f.inputTokens += r.input_tokens; f.outputTokens += r.output_tokens; f.costUsd += Number(r.cost_usd);
        byFeature.set(r.feature, f);
        const uk = r.user_id ?? 'system';
        const u = byUser.get(uk) ?? { userId: r.user_id, email: null, calls: 0, costUsd: 0 };
        u.calls++; u.costUsd += Number(r.cost_usd);
        byUser.set(uk, u);
        if (String(r.created_at).startsWith(todayStart)) { today.calls++; today.costUsd += Number(r.cost_usd); }
    }
    const userIds = [...byUser.values()].map((u) => u.userId).filter((id): id is string => !!id);
    if (userIds.length) {
        const { data: profiles } = await admin.from('profiles').select('id, email').in('id', userIds);
        for (const p of profiles ?? []) {
            const u = byUser.get(p.id);
            if (u) u.email = p.email;
        }
    }
    const round = (n: number) => Math.round(n * 10000) / 10000;
    return {
        month,
        spentUsd: round(Number(budget?.spent_usd ?? 0)),
        capUsd: Number(budget?.cap_usd ?? LIMITS.monthlyCapUsd),
        calls: Number(budget?.calls ?? rows?.length ?? 0),
        byFeature: [...byFeature.values()].map((f) => ({ ...f, costUsd: round(f.costUsd) })).sort((a, b) => b.costUsd - a.costUsd),
        byUser: [...byUser.values()].map((u) => ({ ...u, costUsd: round(u.costUsd) })).sort((a, b) => b.costUsd - a.costUsd),
        today: { calls: today.calls, costUsd: round(today.costUsd) },
    };
}
