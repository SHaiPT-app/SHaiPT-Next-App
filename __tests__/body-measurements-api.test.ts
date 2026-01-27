/**
 * @jest-environment node
 */
import { GET, POST, PUT, DELETE } from '@/app/api/body-measurements/route';
import { NextRequest } from 'next/server';

// Mock the db module
jest.mock('@/lib/supabaseDb', () => ({
    db: {
        bodyMeasurements: {
            getByUser: jest.fn(),
            getById: jest.fn(),
            getByUserAndDate: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

import { db } from '@/lib/supabaseDb';

const mockedDb = db as jest.Mocked<typeof db>;

function createRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('Body Measurements API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/body-measurements', () => {
        it('returns 400 if userId is missing', async () => {
            const req = createRequest('/api/body-measurements');
            const res = await GET(req);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('userId is required');
        });

        it('returns measurements for a user', async () => {
            const mockMeasurements = [
                {
                    id: 'meas-1',
                    user_id: 'user-1',
                    date: '2026-01-27',
                    weight_kg: 80,
                    waist_cm: 85,
                },
            ];
            (mockedDb.bodyMeasurements.getByUser as jest.Mock).mockResolvedValue(mockMeasurements);

            const req = createRequest('/api/body-measurements?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.measurements).toEqual(mockMeasurements);
            expect(mockedDb.bodyMeasurements.getByUser).toHaveBeenCalledWith('user-1');
        });

        it('returns 500 on database error', async () => {
            (mockedDb.bodyMeasurements.getByUser as jest.Mock).mockRejectedValue(new Error('DB error'));

            const req = createRequest('/api/body-measurements?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/body-measurements', () => {
        it('returns 400 if user_id is missing', async () => {
            const req = createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({ weight_kg: 80 }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it('creates a measurement successfully', async () => {
            const mockCreated = {
                id: 'meas-new',
                user_id: 'user-1',
                date: '2026-01-27',
                weight_kg: 80,
            };
            (mockedDb.bodyMeasurements.create as jest.Mock).mockResolvedValue(mockCreated);

            const req = createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: 'user-1',
                    date: '2026-01-27',
                    weight_kg: 80,
                    waist_cm: 85,
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.measurement).toEqual(mockCreated);
        });

        it('uses current date if not provided', async () => {
            const mockCreated = {
                id: 'meas-new',
                user_id: 'user-1',
                date: new Date().toISOString().split('T')[0],
                weight_kg: 75,
            };
            (mockedDb.bodyMeasurements.create as jest.Mock).mockResolvedValue(mockCreated);

            const req = createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'user-1', weight_kg: 75 }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(201);

            const createCall = (mockedDb.bodyMeasurements.create as jest.Mock).mock.calls[0][0];
            expect(createCall.date).toBe(new Date().toISOString().split('T')[0]);
        });
    });

    describe('PUT /api/body-measurements', () => {
        it('returns 400 if id is missing', async () => {
            const req = createRequest('/api/body-measurements', {
                method: 'PUT',
                body: JSON.stringify({ weight_kg: 80 }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await PUT(req);
            expect(res.status).toBe(400);
        });

        it('updates a measurement successfully', async () => {
            const mockUpdated = {
                id: 'meas-1',
                user_id: 'user-1',
                date: '2026-01-27',
                weight_kg: 79,
            };
            (mockedDb.bodyMeasurements.update as jest.Mock).mockResolvedValue(mockUpdated);

            const req = createRequest('/api/body-measurements', {
                method: 'PUT',
                body: JSON.stringify({ id: 'meas-1', weight_kg: 79 }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await PUT(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.measurement.weight_kg).toBe(79);
        });
    });

    describe('DELETE /api/body-measurements', () => {
        it('returns 400 if id is missing', async () => {
            const req = createRequest('/api/body-measurements');
            const res = await DELETE(req);
            expect(res.status).toBe(400);
        });

        it('deletes a measurement successfully', async () => {
            (mockedDb.bodyMeasurements.delete as jest.Mock).mockResolvedValue(undefined);

            const req = createRequest('/api/body-measurements?id=meas-1');
            const res = await DELETE(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });
    });
});
