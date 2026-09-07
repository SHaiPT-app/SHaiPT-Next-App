/**
 * @jest-environment node
 */
import { z } from 'zod';

const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({
        getGenerativeModel: jest.fn(() => ({
            generateContent: mockGenerateContent,
            generateContentStream: mockGenerateContentStream,
        })),
    })),
}));

// A tiny in-memory stand-in for the three gateway tables
const tables: Record<string, Array<Record<string, unknown>>> = { ai_usage: [], ai_budget: [], ai_cache: [] };
let usageToday = { calls: 0, tokens: 0 };

function fakeAdmin() {
    return {
        from: (table: string) => {
            const rows = tables[table];
            const q: Record<string, unknown> = {};
            let filterKey: string | null = null;
            let filterVal: unknown = null;
            q.select = () => q;
            q.eq = (k: string, v: unknown) => { filterKey = k; filterVal = v; return q; };
            q.gte = () => q;
            q.lt = () => q;
            q.in = () => q;
            q.limit = () => Promise.resolve({ data: rows, error: null });
            q.maybeSingle = () => Promise.resolve({ data: rows.find((r) => filterKey && r[filterKey] === filterVal) ?? null, error: null });
            q.insert = (row: Record<string, unknown>) => { rows.push({ ...row, created_at: new Date().toISOString() }); return Promise.resolve({ error: null }); };
            q.upsert = (row: Record<string, unknown>) => { const i = rows.findIndex((r) => r.key === row.key); if (i >= 0) rows[i] = row; else rows.push(row); return Promise.resolve({ error: null }); };
            q.update = () => ({ eq: () => Promise.resolve({ error: null }) });
            return q;
        },
        rpc: () => Promise.resolve({ data: [usageToday], error: null }),
    };
}
jest.mock('@/lib/auth', () => ({ getAdmin: () => fakeAdmin() }));

function geminiResult(text: string, usage = { promptTokenCount: 100, candidatesTokenCount: 50 }) {
    return { response: { text: () => text, usageMetadata: usage } };
}

describe('AI gateway', () => {
    beforeEach(() => {
        tables.ai_usage = []; tables.ai_budget = []; tables.ai_cache = [];
        usageToday = { calls: 0, tokens: 0 };
        mockGenerateContent.mockReset();
        process.env.GEMINI_API_KEY = 'test-key';
        delete process.env.AI_MOCK;
        jest.resetModules();
    });

    it('calls the model with the policy model and cap, logs usage with cost', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        mockGenerateContent.mockResolvedValue(geminiResult('hello'));
        const res = await callModel({ userId: 'u1', feature: 'chat', prompt: 'hi' });
        expect(res.text).toBe('hello');
        expect(res.model).toBe('gemini-2.5-flash-lite');
        expect(res.usage.inputTokens).toBe(100);
        expect(res.usage.outputTokens).toBe(50);
        // 100 * 0.10 + 50 * 0.40 per million
        expect(res.usage.costUsd).toBeCloseTo(0.00003, 6);
        expect(tables.ai_usage).toHaveLength(1);
        expect(tables.ai_usage[0]).toMatchObject({ user_id: 'u1', feature: 'chat', status: 'ok', cost_usd: res.usage.costUsd });
    });

    it('refuses with 429 when the user is over the daily call limit, without calling the model', async () => {
        const { callModel, AiLimitError, limitResponse } = await import('@/lib/ai/gateway');
        usageToday = { calls: 40, tokens: 0 };
        let caught: unknown;
        try { await callModel({ userId: 'u1', feature: 'chat', prompt: 'hi' }); } catch (e) { caught = e; }
        expect(caught).toBeInstanceOf(AiLimitError);
        expect((caught as { reason: string }).reason).toBe('daily_calls');
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(limitResponse(caught)?.status).toBe(429);
    });

    it('refuses when the monthly budget is spent', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        const month = new Date().toISOString().slice(0, 7);
        tables.ai_budget.push({ month, spent_usd: 15, cap_usd: 15 });
        await expect(callModel({ userId: 'u1', feature: 'plan', prompt: 'x' })).rejects.toMatchObject({ reason: 'monthly_budget' });
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('premium features need a tester', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        await expect(callModel({ userId: 'u1', feature: 'photo_assessment', prompt: 'x' })).rejects.toMatchObject({ reason: 'premium' });
        mockGenerateContent.mockResolvedValue(geminiResult('ok'));
        await expect(callModel({ userId: 'u1', feature: 'photo_assessment', prompt: 'x', tester: true })).resolves.toMatchObject({ text: 'ok' });
    });

    it('validates JSON against the schema and repairs once', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        const schema = z.object({ name: z.string(), days: z.number() });
        mockGenerateContent
            .mockResolvedValueOnce(geminiResult('{"name": "PPL"}'))
            .mockResolvedValueOnce(geminiResult('```json\n{"name": "PPL", "days": 3}\n```'));
        const res = await callModel({ userId: 'u1', feature: 'plan', prompt: 'plan me', schema });
        expect(res.json).toEqual({ name: 'PPL', days: 3 });
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        expect(res.usage.inputTokens).toBe(200);
    });

    it('serves identical plan prompts from the cache', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        const schema = z.object({ name: z.string() });
        mockGenerateContent.mockResolvedValue(geminiResult('{"name": "A"}'));
        const first = await callModel({ userId: 'u1', feature: 'plan', prompt: 'same', schema });
        const second = await callModel({ userId: 'u2', feature: 'plan', prompt: 'same', schema });
        expect(first.cached).toBe(false);
        expect(second.cached).toBe(true);
        expect(second.json).toEqual({ name: 'A' });
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        expect(tables.ai_usage.filter((r) => r.cache_hit)).toHaveLength(1);
    });

    it('does not cache chat', async () => {
        const { callModel } = await import('@/lib/ai/gateway');
        mockGenerateContent.mockResolvedValue(geminiResult('a'));
        await callModel({ userId: 'u1', feature: 'chat', prompt: 'same' });
        await callModel({ userId: 'u1', feature: 'chat', prompt: 'same' });
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('uses the mock when AI_MOCK=1 and logs zero cost', async () => {
        process.env.AI_MOCK = '1';
        const { callModel } = await import('@/lib/ai/gateway');
        const res = await callModel({ userId: 'u1', feature: 'chat', prompt: 'hi', mock: () => 'canned' });
        expect(res.mocked).toBe(true);
        expect(res.text).toBe('canned');
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(tables.ai_usage[0]).toMatchObject({ model: 'mock', cost_usd: 0 });
    });

    it('trims chat history to the last 12 turns', async () => {
        const { trimHistory } = await import('@/lib/ai/gateway');
        const msgs = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: String(i) }));
        const trimmed = trimHistory(msgs);
        expect(trimmed).toHaveLength(12);
        expect(trimmed[11].content).toBe('29');
    });

    it('streams text and logs usage when done', async () => {
        const { streamModel } = await import('@/lib/ai/gateway');
        mockGenerateContentStream.mockResolvedValue({
            stream: (async function* () { yield { text: () => 'Hel' }; yield { text: () => 'lo' }; })(),
            response: Promise.resolve({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 } }),
        });
        const { stream, done } = await streamModel({ userId: 'u1', feature: 'chat', messages: [{ role: 'user', content: 'hi' }] });
        const reader = stream.getReader();
        let out = '';
        for (;;) { const { value, done: d } = await reader.read(); if (d) break; out += new TextDecoder().decode(value); }
        expect(out).toBe('Hello');
        const result = await done;
        expect(result.text).toBe('Hello');
        expect(tables.ai_usage[0]).toMatchObject({ feature: 'chat', input_tokens: 10, output_tokens: 2, status: 'ok' });
    });
});
