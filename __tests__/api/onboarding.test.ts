/** @jest-environment node */
import { callModel } from '@/lib/ai/gateway';
import { POST } from '@/app/api/onboarding/route';
import { signIn, signOut, post, modelText } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/gateway', () => jest.requireActual('@/test-utils/api').gatewayMockFactory());
const mockCallModel = callModel as jest.Mock;

describe('POST /api/onboarding', () => {
    beforeEach(() => { jest.clearAllMocks(); signIn(); });

    it('returns 401 without a user', async () => {
        signOut();
        expect((await POST(post('/api/onboarding', { messages: [{ role: 'user', content: 'hi' }] }))).status).toBe(401);
    });

    it('returns 400 without messages', async () => {
        expect((await POST(post('/api/onboarding', { messages: [] }))).status).toBe(400);
    });

    it('returns the coach reply from one gated onboarding_chat call with the system prompt', async () => {
        mockCallModel.mockResolvedValue(modelText('Great! What is your experience level?'));
        const res = await POST(post('/api/onboarding', { messages: [{ role: 'user', content: 'I want to build muscle' }] }));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ message: 'Great! What is your experience level?', isComplete: false });
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts.feature).toBe('onboarding_chat');
        expect(opts.userId).toBe('u1');
        expect(opts.system).toContain('one topic at a time');
        expect(opts.messages).toHaveLength(1);
    });

    it('detects the completion marker and strips it', async () => {
        mockCallModel.mockResolvedValue(modelText('Here is your summary. [ONBOARDING_COMPLETE]'));
        const json = await (await POST(post('/api/onboarding', { messages: [{ role: 'user', content: 'no restrictions' }] }))).json();
        expect(json).toEqual({ message: 'Here is your summary.', isComplete: true });
    });
});
