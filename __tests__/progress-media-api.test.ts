/**
 * @jest-environment node
 */
import { GET, DELETE } from '@/app/api/progress-media/route';
import { NextRequest } from 'next/server';

// Mock supabase storage
const mockCreateSignedUrl = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {
        storage: {
            from: jest.fn(() => ({
                createSignedUrl: mockCreateSignedUrl,
                upload: jest.fn().mockResolvedValue({ error: null }),
                remove: mockRemove,
            })),
        },
    },
}));

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        progressMedia: {
            getByUser: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

import { db } from '@/lib/supabaseDb';

const mockedDb = db as jest.Mocked<typeof db>;

function createRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('Progress Media API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/progress-media', () => {
        it('returns 400 if userId is missing', async () => {
            const req = createRequest('/api/progress-media');
            const res = await GET(req);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('userId is required');
        });

        it('returns media with signed URLs for a user', async () => {
            const mockMedia = [
                {
                    id: 'media-1',
                    user_id: 'user-1',
                    media_type: 'image',
                    storage_path: 'user-1/photo.jpg',
                    visibility: 'private',
                    taken_at: '2026-01-27T00:00:00Z',
                },
            ];
            (mockedDb.progressMedia.getByUser as jest.Mock).mockResolvedValue(mockMedia);
            mockCreateSignedUrl.mockResolvedValue({
                data: { signedUrl: 'https://storage.example.com/signed-url' },
            });

            const req = createRequest('/api/progress-media?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.media).toHaveLength(1);
            expect(body.media[0].url).toBe('https://storage.example.com/signed-url');
        });

        it('returns 500 on database error', async () => {
            (mockedDb.progressMedia.getByUser as jest.Mock).mockRejectedValue(new Error('DB error'));

            const req = createRequest('/api/progress-media?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /api/progress-media', () => {
        it('returns 400 if id is missing', async () => {
            const req = createRequest('/api/progress-media');
            const res = await DELETE(req);
            expect(res.status).toBe(400);
        });

        it('returns 404 if media not found', async () => {
            (mockedDb.progressMedia.getById as jest.Mock).mockResolvedValue(null);

            const req = createRequest('/api/progress-media?id=nonexistent');
            const res = await DELETE(req);
            expect(res.status).toBe(404);
        });

        it('deletes media and its storage file', async () => {
            const mockMedia = {
                id: 'media-1',
                user_id: 'user-1',
                media_type: 'image',
                storage_path: 'user-1/photo.jpg',
                visibility: 'private',
            };
            (mockedDb.progressMedia.getById as jest.Mock).mockResolvedValue(mockMedia);
            mockRemove.mockResolvedValue({ error: null });
            (mockedDb.progressMedia.delete as jest.Mock).mockResolvedValue(undefined);

            const req = createRequest('/api/progress-media?id=media-1');
            const res = await DELETE(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockedDb.progressMedia.delete).toHaveBeenCalledWith('media-1');
        });
    });
});
