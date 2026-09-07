/** @jest-environment node */
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { callModel, AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/dietitian-interview/route';

jest.mock('@/lib/auth', () => ({
    ...jest.requireActual('@/lib/auth'),
    getUser: jest.fn(),
    getProfileBits: jest.fn(async () => ({ id: 'u1', role: 'trainee', tester: false, full_name: 'T', email: 't@x' })),
    getAdmin: jest.fn(),
}));
jest.mock('@/lib/ai/gateway', () => ({
    ...jest.requireActual('@/lib/ai/gateway'),
    callModel: jest.fn(),
    streamModel: jest.fn(),
}));

const mockGetUser = getUser as jest.Mock;
const mockCallModel = callModel as jest.Mock;

function signIn() {
    mockGetUser.mockResolvedValue({ user: { id: 'u1', email: 't@x' }, token: 'tok', supabase: { from: jest.fn() } });
}
function signOut() {
    mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
}
function post(body: unknown) {
    return new Request('http://localhost/api/ai-coach/dietitian-interview', {
        method: 'POST', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
}
const ZERO = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };
const reply = (text: string, json?: unknown) => ({ text, json, usage: ZERO, model: 'test-model', cached: false, mocked: false });

describe('POST /api/ai-coach/dietitian-interview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        signIn();
    });

    it('returns 401 without a user', async () => {
        signOut();
        const res = await POST(post({ messages: [] }));
        expect(res.status).toBe(401);
        expect(mockCallModel).not.toHaveBeenCalled();
    });

    it('returns 400 without messages', async () => {
        expect((await POST(post({}))).status).toBe(400);
        expect(mockCallModel).not.toHaveBeenCalled();
    });

    it('replies as Dr. Nadia in plain text, with the training-intake context in the system prompt', async () => {
        mockCallModel.mockResolvedValue(reply('Hello! Any food allergies or intolerances?'));
        const res = await POST(post({
            messages: [{ role: 'user', content: 'Hi' }],
            previousContext: [{ role: 'user', content: 'I train four days a week for strength' }],
            userId: 'someone-else',
        }));
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toContain('text/plain');
        expect(res.headers.get('X-Interview-Complete')).toBeNull();
        expect(await res.text()).toBe('Hello! Any food allergies or intolerances?');

        const opts = mockCallModel.mock.calls[0][0];
        expect(opts).toMatchObject({ feature: 'dietitian_interview', userId: 'u1', tester: false, messages: [{ role: 'user', content: 'Hi' }] });
        expect(opts.userId).not.toBe('someone-else');
        expect(opts.system).toContain('Dr. Nadia');
        expect(opts.system).toContain('I train four days a week for strength');
    });

    it('sets X-Interview-Complete and strips the marker when the interview is done', async () => {
        mockCallModel.mockResolvedValue(reply('I have everything I need. [INTERVIEW_COMPLETE]'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'Four meals, I like cooking' }] }));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Interview-Complete')).toBe('true');
        const text = await res.text();
        expect(text).toBe('I have everything I need.');
        expect(text).not.toContain('[INTERVIEW_COMPLETE]');
    });

    it('extracts the diet intake form as JSON through a schema call', async () => {
        const form = { allergies: 'peanuts', intolerances: 'lactose', diet_style: 'Vegetarian', foods_love: 'curry', foods_hate: 'olives', medical_dietary_considerations: '', meals_per_day: '4', cooking_preferences: 'meal prep' };
        mockCallModel.mockResolvedValue(reply(JSON.stringify(form), form));
        const res = await POST(post({
            action: 'extract_form_data',
            messages: [{ role: 'assistant', content: 'Allergies?' }, { role: 'user', content: 'Peanuts, and lactose bothers me' }],
        }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(form);
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts).toMatchObject({ feature: 'dietitian_interview', userId: 'u1', temperature: 0.1 });
        expect(opts.schema).toBeDefined();
        expect(opts.prompt).toContain('CLIENT: Peanuts, and lactose bothers me');
        expect(opts.prompt).toContain('DIETITIAN: Allergies?');
    });

    it('passes a gateway limit through as 429 with the reason', async () => {
        mockCallModel.mockRejectedValue(new AiLimitError('limit', 'daily_calls'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }] }));
        expect(res.status).toBe(429);
        expect(await res.json()).toMatchObject({ reason: 'daily_calls' });
    });
});
