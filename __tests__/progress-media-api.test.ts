/**
 * @jest-environment node
 */
import { GET, DELETE } from '@/app/api/progress-media/route';
import { NextRequest, NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockRemove = jest.fn();
const mockStorageFrom = jest.fn(() => ({
    createSignedUrl: mockCreateSignedUrl,
    upload: jest.fn().mockResolvedValue({ error: null }),
    remove: mockRemove,
}));

jest.mock('@/lib/auth', () => {
    const { NextResponse: NR } = jest.requireActual('next/server');
    return {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        isErrorResponse: (r: unknown) => r instanceof NR,
        getAdmin: jest.fn(),
        userClient: jest.fn(),
        bearerToken: jest.fn(),
    };
});

function chain(result: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single', 'maybeSingle']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

const USER = 'user-1';
function signedIn() {
    mockGetUser.mockResolvedValue({
        user: { id: USER },
        token: 'tok',
        supabase: { from: mockFrom, storage: { from: mockStorageFrom } },
    });
}
function signedOut() {
    mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
}

function createRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('Progress Media API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/progress-media', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const res = await GET(createRequest('/api/progress-media?userId=user-1'));
            expect(res.status).toBe(401);
        });

        it("returns the caller's media with signed URLs", async () => {
            signedIn();
            const mockMedia = [{
                id: 'media-1', user_id: USER, media_type: 'image', storage_path: 'user-1/photo.jpg',
                visibility: 'private', taken_at: '2026-01-27T00:00:00Z',
            }];
            const q = chain({ data: mockMedia, error: null });
            mockFrom.mockReturnValue(q);
            mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example.com/signed-url' } });

            const res = await GET(createRequest('/api/progress-media?userId=someone-else'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.media).toHaveLength(1);
            expect(body.media[0].url).toBe('https://storage.example.com/signed-url');
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
            expect(mockStorageFrom).toHaveBeenCalledWith('progress-media');
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));
            const res = await GET(createRequest('/api/progress-media'));
            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /api/progress-media', () => {
        it('returns 400 if id is missing', async () => {
            signedIn();
            const res = await DELETE(createRequest('/api/progress-media'));
            expect(res.status).toBe(400);
        });

        it('returns 404 if media not found (or not the caller\'s)', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: null }));
            const res = await DELETE(createRequest('/api/progress-media?id=nonexistent'));
            expect(res.status).toBe(404);
        });

        it('deletes media and its storage file', async () => {
            signedIn();
            const mockMedia = { id: 'media-1', user_id: USER, media_type: 'image', storage_path: 'user-1/photo.jpg', visibility: 'private' };
            const fetchQ = chain({ data: mockMedia, error: null });
            const deleteQ = chain({ error: null });
            mockFrom.mockReturnValueOnce(fetchQ).mockReturnValueOnce(deleteQ);
            mockRemove.mockResolvedValue({ error: null });

            const res = await DELETE(createRequest('/api/progress-media?id=media-1'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockRemove).toHaveBeenCalledWith(['user-1/photo.jpg']);
            expect(deleteQ.delete).toHaveBeenCalled();
            expect(deleteQ.eq).toHaveBeenCalledWith('id', 'media-1');
            expect(deleteQ.eq).toHaveBeenCalledWith('user_id', USER);
        });
    });
});
