/** @jest-environment node */
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { callModel, AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/interview/route';

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
    return new Request('http://localhost/api/ai-coach/interview', {
        method: 'POST', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
}
const ZERO = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };
const reply = (text: string, json?: unknown) => ({ text, json, usage: ZERO, model: 'test-model', cached: false, mocked: false });

describe('POST /api/ai-coach/interview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        signIn();
    });

    it('returns 401 without a user', async () => {
        signOut();
        const res = await POST(post({ messages: [], coachId: 'bodybuilding' }));
        expect(res.status).toBe(401);
        expect(mockCallModel).not.toHaveBeenCalled();
    });

    it('returns 400 without messages or without a coachId', async () => {
        expect((await POST(post({ coachId: 'bodybuilding' }))).status).toBe(400);
        expect((await POST(post({ messages: [{ role: 'user', content: 'hi' }] }))).status).toBe(400);
        expect(mockCallModel).not.toHaveBeenCalled();
    });

    it('replies as the chosen coach persona in plain text', async () => {
        mockCallModel.mockResolvedValue(reply("Let's sculpt this physique. What's your name? [STEP:basic_info]"));
        const res = await POST(post({ messages: [{ role: 'user', content: 'Hello' }], coachId: 'bodybuilding', prefilledFields: ['age', 'height'], userId: 'someone-else' }));
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toContain('text/plain');
        expect(res.headers.get('X-Interview-Complete')).toBeNull();
        expect(await res.text()).toContain("Let's sculpt this physique.");

        const opts = mockCallModel.mock.calls[0][0];
        expect(opts).toMatchObject({ feature: 'interview', userId: 'u1', tester: false, messages: [{ role: 'user', content: 'Hello' }] });
        expect(opts.userId).not.toBe('someone-else');
        expect(opts.system).toContain('Marcus');
        // The prefilled fields are now named on one line rather than as a bullet list.
        expect(opts.system).toContain('never ask about these: age, height');
        expect(opts.schema).toBeUndefined();
    });

    it('sets X-Interview-Complete and strips the marker when the interview is done', async () => {
        mockCallModel.mockResolvedValue(reply('That is everything I need. Time to build. [INTERVIEW_COMPLETE]'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'Beginner' }], coachId: 'crossfit' }));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Interview-Complete')).toBe('true');
        const text = await res.text();
        expect(text).toBe('That is everything I need. Time to build.');
        expect(text).not.toContain('[INTERVIEW_COMPLETE]');
    });

    it('extracts the intake form as JSON through a schema call', async () => {
        const form = { name: 'Ali H', age: '29', height: "5'11", weight: '180 lbs', fitness_goals: 'build muscle', training_days_per_week: '4' };
        mockCallModel.mockResolvedValue(reply(JSON.stringify(form), form));
        const res = await POST(post({
            action: 'extract_form_data',
            messages: [{ role: 'assistant', content: 'Name?' }, { role: 'user', content: "Ali H, 29, 5'11, 180 lbs" }],
        }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(form);
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts).toMatchObject({ feature: 'interview', userId: 'u1', temperature: 0.1 });
        expect(opts.schema).toBeDefined();
        expect(opts.prompt).toContain("CLIENT: Ali H, 29, 5'11, 180 lbs");
        expect(opts.prompt).toContain('COACH: Name?');
    });

    it('passes a gateway limit through as 429 with the reason', async () => {
        mockCallModel.mockRejectedValue(new AiLimitError('limit', 'daily_calls'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }], coachId: 'bodybuilding' }));
        expect(res.status).toBe(429);
        expect(await res.json()).toMatchObject({ reason: 'daily_calls' });
    });

    it('returns 500 with the message on other errors', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockCallModel.mockRejectedValue(new Error('model exploded'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }], coachId: 'bodybuilding' }));
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'model exploded' });
        errSpy.mockRestore();
    });
});
