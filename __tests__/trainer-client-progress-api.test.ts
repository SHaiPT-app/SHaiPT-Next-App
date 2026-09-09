/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/trainer/clients/progress/route';

const mockFrom = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockStorageFrom = jest.fn();
const mockRequireTrainer = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: Res } = jest.requireActual('next/server');
    return {
        requireTrainer: (...args: unknown[]) => mockRequireTrainer(...args),
        isErrorResponse: (r: unknown) => r instanceof Res,
        getAdmin: jest.fn(),
        isActiveCoachOf: jest.fn(),
    };
});

const TRAINER_ID = 't1';

/** Mirrors lib/auth requireTrainer: 401 without a token, 403 unless the caller is a trainer. */
function trainerAuthFor(role: 'trainer' | 'trainee') {
    return (request: Request) => {
        if (!request.headers.get('Authorization')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (role !== 'trainer') {
            return NextResponse.json({ error: 'Trainer account required' }, { status: 403 });
        }
        return {
            user: { id: TRAINER_ID },
            token: 'token',
            supabase: {
                from: (...args: unknown[]) => mockFrom(...args),
                storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
            },
            profile: { id: TRAINER_ID, role },
        };
    };
}

function createChain(resolvedData: unknown = null, resolvedError: unknown = null) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.not = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
    return chain;
}

function createRequest(url: string, withAuth = true): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
        headers: withAuth ? { Authorization: 'Bearer token' } : {},
    });
}

describe('Trainer Client Progress API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireTrainer.mockImplementation(trainerAuthFor('trainer'));
        mockStorageFrom.mockReturnValue({
            createSignedUrl: mockCreateSignedUrl,
        });
    });

    it('returns 400 if clientId is missing', async () => {
        const res = await GET(createRequest('/api/trainer/clients/progress?trainerId=t1'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('clientId is required');
    });

    it('returns 401 if no Authorization header', async () => {
        const res = await GET(createRequest('/api/trainer/clients/progress?clientId=c1', false));
        expect(res.status).toBe(401);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns 403 if the caller is not a trainer', async () => {
        mockRequireTrainer.mockImplementation(trainerAuthFor('trainee'));

        const res = await GET(createRequest('/api/trainer/clients/progress?clientId=c1'));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Trainer account required');
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns 403 if no active coaching relationship', async () => {
        // Under RLS the relationship row is absent for a non-coach: .single() errors
        const relChain = createChain(null, { code: 'PGRST116', message: 'Not found' });
        mockFrom.mockReturnValue(relChain);

        const res = await GET(createRequest('/api/trainer/clients/progress?clientId=c1'));
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toBe('Coaching relationship error: Not found');
    });

    it('returns data without workouts when can_view_workouts is false', async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') {
                return createChain({
                    id: 'rel-1',
                    coach_id: 't1',
                    athlete_id: 'c1',
                    status: 'active',
                    can_view_workouts: false,
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
            return createChain(null);
        });

        const res = await GET(createRequest('/api/trainer/clients/progress?clientId=c1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.permissions.can_view_workouts).toBe(false);
        expect(body.workoutLogs).toEqual([]);
        expect(body.bodyMeasurements).toEqual([]);
        expect(body.progressMedia).toEqual([]);
        expect(body.client.full_name).toBe('Test Client');
    });

    it('returns full progress data for the caller, ignoring the trainerId param', async () => {
        const relChain = createChain({
            id: 'rel-1',
            coach_id: 't1',
            athlete_id: 'c1',
            status: 'active',
            can_view_workouts: true,
            can_assign_plans: true,
        });
        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') return relChain;
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
            chain.not = jest.fn().mockReturnValue(chain);
            chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
            chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

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

        const res = await GET(createRequest('/api/trainer/clients/progress?trainerId=someone-else&clientId=c1'));
        expect(res.status).toBe(200);
        const body = await res.json();

        expect(body.permissions.can_view_workouts).toBe(true);
        expect(body.client.full_name).toBe('Test Client');
        expect(body.workoutLogs).toHaveLength(1);
        expect(body.workoutLogs[0].exercise_logs).toHaveLength(1);
        expect(body.bodyMeasurements).toHaveLength(1);
        expect(body.progressMedia).toHaveLength(1);
        expect(body.progressMedia[0].url).toBe('https://storage.example.com/signed');

        // The relationship is looked up from the caller's side, not the query param's
        expect(relChain.eq).toHaveBeenCalledWith('coach_id', TRAINER_ID);
        expect(relChain.eq).toHaveBeenCalledWith('athlete_id', 'c1');
        expect(relChain.eq).not.toHaveBeenCalledWith('coach_id', 'someone-else');
    });

    it('returns 500 on unexpected error', async () => {
        mockFrom.mockImplementation(() => {
            throw new Error('Unexpected DB error');
        });

        const res = await GET(createRequest('/api/trainer/clients/progress?clientId=c1'));
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Unexpected DB error');
    });
});
