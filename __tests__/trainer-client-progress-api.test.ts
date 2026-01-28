/**
 * @jest-environment node
 */
import { GET } from '@/app/api/trainer/clients/progress/route';

// Mock supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockStorageFrom = jest.fn();

function createChain(resolvedData: unknown = null, resolvedError: unknown = null) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
    // For non-single queries, resolve with data
    chain.then = undefined as unknown as jest.Mock;
    // Make the chain itself a thenable when awaited (for non-.single() queries)
    return chain;
}

jest.mock('@/lib/supabase', () => {
    return {
        supabase: {
            from: (...args: unknown[]) => mockFrom(...args),
            storage: {
                from: (...args: unknown[]) => mockStorageFrom(...args),
            },
        },
    };
});

function createRequest(url: string, options?: RequestInit): Request {
    return new Request(new URL(url, 'http://localhost:3000'), options);
}

describe('Trainer Client Progress API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageFrom.mockReturnValue({
            createSignedUrl: mockCreateSignedUrl,
        });
    });

    it('returns 400 if trainerId is missing', async () => {
        const req = createRequest('/api/trainer/clients/progress?clientId=c1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('trainerId and clientId are required');
    });

    it('returns 400 if clientId is missing', async () => {
        const req = createRequest('/api/trainer/clients/progress?trainerId=t1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('trainerId and clientId are required');
    });

    it('returns 401 if no Authorization header', async () => {
        const req = createRequest('/api/trainer/clients/progress?trainerId=t1&clientId=c1');
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it('returns 403 if no active coaching relationship', async () => {
        // Mock coaching_relationships query returning nothing
        const relChain = createChain(null, { code: 'PGRST116', message: 'Not found' });
        mockFrom.mockReturnValue(relChain);

        const req = createRequest('/api/trainer/clients/progress?trainerId=t1&clientId=c1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('No active coaching relationship found');
    });

    it('returns data without workouts when can_view_workouts is false', async () => {
        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') {
                const chain = createChain({
                    id: 'rel-1',
                    coach_id: 't1',
                    athlete_id: 'c1',
                    status: 'active',
                    can_view_workouts: false,
                    can_assign_plans: true,
                });
                return chain;
            }
            if (table === 'profiles') {
                const chain = createChain({
                    id: 'c1',
                    email: 'client@test.com',
                    username: 'client1',
                    full_name: 'Test Client',
                    avatar_url: null,
                    role: 'trainee',
                });
                return chain;
            }
            return createChain(null);
        });

        const req = createRequest('/api/trainer/clients/progress?trainerId=t1&clientId=c1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.permissions.can_view_workouts).toBe(false);
        expect(body.workoutLogs).toEqual([]);
        expect(body.bodyMeasurements).toEqual([]);
        expect(body.progressMedia).toEqual([]);
        expect(body.client.full_name).toBe('Test Client');
    });

    it('returns full progress data when coach has view permission', async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') {
                return createChain({
                    id: 'rel-1',
                    coach_id: 't1',
                    athlete_id: 'c1',
                    status: 'active',
                    can_view_workouts: true,
                    can_assign_plans: true,
                });
            }
            if (table === 'profiles') {
                return createChain({
                    id: 'c1',
                    email: 'client@test.com',
                    username: 'client1',
                    full_name: 'Test Client',
                    avatar_url: null,
                    role: 'trainee',
                });
            }
            // For other tables, return chains that resolve through .order() or .limit()
            const chain: Record<string, jest.Mock> = {};
            chain.select = jest.fn().mockReturnValue(chain);
            chain.eq = jest.fn().mockReturnValue(chain);
            chain.in = jest.fn().mockReturnValue(chain);
            chain.single = jest.fn().mockResolvedValue({ data: null, error: null });

            if (table === 'workout_logs') {
                chain.order = jest.fn().mockReturnValue(chain);
                chain.limit = jest.fn().mockResolvedValue({
                    data: [
                        { id: 'log-1', user_id: 'c1', date: '2026-01-20', total_duration_seconds: 3600 },
                    ],
                    error: null,
                });
                return chain;
            }
            if (table === 'exercise_logs') {
                chain.in = jest.fn().mockResolvedValue({
                    data: [
                        { id: 'el-1', workout_log_id: 'log-1', exercise_id: 'bench', sets: [], total_sets: 3 },
                    ],
                    error: null,
                });
                return chain;
            }
            if (table === 'body_measurements') {
                chain.order = jest.fn().mockResolvedValue({
                    data: [
                        { id: 'bm-1', user_id: 'c1', date: '2026-01-20', weight_kg: 80 },
                    ],
                    error: null,
                });
                return chain;
            }
            if (table === 'progress_media') {
                chain.order = jest.fn().mockResolvedValue({
                    data: [
                        { id: 'pm-1', user_id: 'c1', storage_path: 'c1/photo.jpg', visibility: 'public', media_type: 'image' },
                    ],
                    error: null,
                });
                return chain;
            }
            return chain;
        });

        mockCreateSignedUrl.mockResolvedValue({
            data: { signedUrl: 'https://storage.example.com/signed' },
        });

        const req = createRequest('/api/trainer/clients/progress?trainerId=t1&clientId=c1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.permissions.can_view_workouts).toBe(true);
        expect(body.client.full_name).toBe('Test Client');
        expect(body.workoutLogs).toHaveLength(1);
        expect(body.workoutLogs[0].exercise_logs).toHaveLength(1);
        expect(body.bodyMeasurements).toHaveLength(1);
        expect(body.progressMedia).toHaveLength(1);
        expect(body.progressMedia[0].url).toBe('https://storage.example.com/signed');
    });

    it('returns 500 on unexpected error', async () => {
        mockFrom.mockImplementation(() => {
            throw new Error('Unexpected DB error');
        });

        const req = createRequest('/api/trainer/clients/progress?trainerId=t1&clientId=c1', {
            headers: { Authorization: 'Bearer token' },
        });
        const res = await GET(req);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Unexpected DB error');
    });
});
