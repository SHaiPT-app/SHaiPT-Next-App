/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/direct-messages/route';

// Chainable mock of the caller's Supabase client (auth.supabase)
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOr = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockSingle = jest.fn();
const mockFrom = jest.fn(() => ({
    select: mockSelect,
    eq: mockEq,
    or: mockOr,
    order: mockOrder,
    limit: mockLimit,
    insert: mockInsert,
    single: mockSingle,
}));
const mockGetUser = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: Res } = jest.requireActual('next/server');
    return {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        isErrorResponse: (r: unknown) => r instanceof Res,
        getAdmin: jest.fn(),
    };
});

const CALLER_ID = 'user-1';

/** Mirrors lib/auth getUser: 401 without a bearer token, otherwise the caller's context. */
function authFor(request: Request) {
    if (!request.headers.get('Authorization')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { user: { id: CALLER_ID }, token: 'test-token', supabase: { from: mockFrom } };
}

function createRequest(url: string, options?: RequestInit) {
    return new Request(`http://localhost:3000${url}`, {
        headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
        ...options,
    });
}

describe('/api/direct-messages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockImplementation(authFor);
        // Reset chain methods
        mockSelect.mockReturnThis();
        mockEq.mockReturnThis();
        mockOr.mockReturnThis();
        mockOrder.mockReturnThis();
        mockLimit.mockReturnThis();
        mockInsert.mockReturnThis();
    });

    describe('GET', () => {
        it('returns 401 if no Authorization header', async () => {
            const req = new Request(
                'http://localhost:3000/api/direct-messages?userId=user-1',
                { method: 'GET' }
            );
            const res = await GET(req);
            expect(res.status).toBe(401);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns 403 if no active coaching relationship when otherUserId provided', async () => {
            // First call: coaching_relationships query returns empty
            mockLimit.mockResolvedValueOnce({ data: [], error: null });

            const req = createRequest('/api/direct-messages?otherUserId=user-2');
            const res = await GET(req);
            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data.error).toBe('No active coaching relationship found');
        });

        it('returns messages for a conversation when relationship exists', async () => {
            const mockMessages = [
                {
                    id: 'msg-1',
                    sender_id: 'user-1',
                    recipient_id: 'user-2',
                    content: 'Hello',
                    created_at: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'msg-2',
                    sender_id: 'user-2',
                    recipient_id: 'user-1',
                    content: 'Hi there',
                    created_at: '2024-01-01T00:01:00Z',
                },
            ];

            // First call: coaching_relationships check
            mockLimit.mockResolvedValueOnce({
                data: [{ id: 'rel-1' }],
                error: null,
            });
            // Second call: direct_messages query
            mockOrder.mockResolvedValueOnce({
                data: mockMessages,
                error: null,
            });

            const req = createRequest('/api/direct-messages?otherUserId=user-2');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.messages).toHaveLength(2);
            expect(data.messages[0].content).toBe('Hello');
            // The relationship and the conversation are scoped to the caller
            expect(mockOr).toHaveBeenCalledWith(
                'and(coach_id.eq.user-1,athlete_id.eq.user-2),and(coach_id.eq.user-2,athlete_id.eq.user-1)'
            );
        });

        it('lists the caller\'s conversations and ignores a userId query param', async () => {
            const mockMessages = [
                {
                    id: 'msg-1',
                    sender_id: 'user-1',
                    recipient_id: 'user-2',
                    content: 'Hello',
                    created_at: '2024-01-01T00:01:00Z',
                },
                {
                    id: 'msg-2',
                    sender_id: 'user-3',
                    recipient_id: 'user-1',
                    content: 'Hey',
                    created_at: '2024-01-01T00:00:00Z',
                },
            ];

            mockOrder.mockResolvedValueOnce({
                data: mockMessages,
                error: null,
            });

            const req = createRequest('/api/direct-messages?userId=someone-else');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.conversations).toHaveLength(2);
            expect(data.conversations[0].partnerId).toBe('user-2');
            expect(data.conversations[1].partnerId).toBe('user-3');
            expect(mockOr).toHaveBeenCalledWith('sender_id.eq.user-1,recipient_id.eq.user-1');
        });
    });

    describe('POST', () => {
        it('returns 400 if required fields are missing', async () => {
            const req = createRequest('/api/direct-messages', {
                method: 'POST',
                body: JSON.stringify({ content: 'Hello' }),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('recipientId and content are required');
        });

        it('returns 400 if content is empty string', async () => {
            const req = createRequest('/api/direct-messages', {
                method: 'POST',
                body: JSON.stringify({
                    recipientId: 'user-2',
                    content: '   ',
                }),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('content must be a non-empty string');
        });

        it('returns 401 if no Authorization header', async () => {
            const req = new Request(
                'http://localhost:3000/api/direct-messages',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientId: 'user-2',
                        content: 'Hello',
                    }),
                }
            );
            const res = await POST(req);
            expect(res.status).toBe(401);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns 403 if no coaching relationship', async () => {
            mockLimit.mockResolvedValueOnce({ data: [], error: null });

            const req = createRequest('/api/direct-messages', {
                method: 'POST',
                body: JSON.stringify({
                    recipientId: 'user-2',
                    content: 'Hello',
                }),
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it('creates a message from the caller, ignoring senderId in the body', async () => {
            const newMessage = {
                id: 'msg-new',
                sender_id: 'user-1',
                recipient_id: 'user-2',
                content: 'Hello',
                created_at: '2024-01-01T00:00:00Z',
            };

            // coaching_relationships check
            mockLimit.mockResolvedValueOnce({
                data: [{ id: 'rel-1' }],
                error: null,
            });
            // insert chain
            mockSingle.mockResolvedValueOnce({ data: newMessage, error: null });

            const req = createRequest('/api/direct-messages', {
                method: 'POST',
                body: JSON.stringify({
                    senderId: 'attacker',
                    recipientId: 'user-2',
                    content: 'Hello',
                }),
            });
            const res = await POST(req);
            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data.message.id).toBe('msg-new');
            expect(data.message.content).toBe('Hello');
            expect(mockInsert).toHaveBeenCalledWith([
                { sender_id: 'user-1', recipient_id: 'user-2', content: 'Hello' },
            ]);
        });

        it('returns 500 on database error', async () => {
            mockLimit.mockResolvedValueOnce({
                data: [{ id: 'rel-1' }],
                error: null,
            });
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: new Error('DB error'),
            });

            const req = createRequest('/api/direct-messages', {
                method: 'POST',
                body: JSON.stringify({
                    recipientId: 'user-2',
                    content: 'Hello',
                }),
            });
            const res = await POST(req);
            expect(res.status).toBe(500);
        });
    });
});
