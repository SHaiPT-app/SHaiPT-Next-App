/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/logs/route';
import { NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

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
    for (const m of ['select', 'insert', 'eq', 'order', 'single']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

const USER = 'user-1';
function signedIn() {
    mockGetUser.mockResolvedValue({ user: { id: USER }, token: 'tok', supabase: { from: mockFrom } });
}

describe('/api/logs (legacy PlanViewer / TraineeDashboard endpoint)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 without a token', async () => {
        mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        expect((await GET(new Request('http://localhost/api/logs?traineeId=user-1'))).status).toBe(401);
        expect((await POST(new Request('http://localhost/api/logs', { method: 'POST', body: '{}' }))).status).toBe(401);
    });

    it('POST writes a workout_logs row for the caller plus exercise_logs rows, ignoring trainee_id', async () => {
        signedIn();
        const logQ = chain({ data: { id: 'log-1', user_id: USER, date: '2026-09-06' }, error: null });
        const exQ = chain({
            data: [{ id: 'ex-1', workout_log_id: 'log-1', exercise_id: 'bench', exercise_order: 1, notes: 'Bench Press',
                sets: [{ set_number: 1, reps: 10, weight: 135, weight_unit: 'lbs', is_pr: true }] }],
            error: null,
        });
        mockFrom.mockReturnValueOnce(logQ).mockReturnValueOnce(exQ);

        const res = await POST(new Request('http://localhost/api/logs', {
            method: 'POST',
            body: JSON.stringify({
                plan_id: 'plan-1',
                trainee_id: 'someone-else',
                notes: 'Session: Push',
                exercises: [{ exerciseId: 'bench', name: 'Bench Press', comments: 'felt good',
                    sets: [{ setNumber: 1, reps: '10', weight: '135', isPr: true }] }],
            }),
        }));
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(mockFrom).toHaveBeenNthCalledWith(1, 'workout_logs');
        expect(mockFrom).toHaveBeenNthCalledWith(2, 'exercise_logs');
        const logRow = (logQ.insert as jest.Mock).mock.calls[0][0];
        expect(logRow.user_id).toBe(USER);
        expect(logRow.notes).toBe('Session: Push');
        expect(logRow).not.toHaveProperty('trainee_id');
        expect(logRow).not.toHaveProperty('plan_id');
        const exRow = (exQ.insert as jest.Mock).mock.calls[0][0][0];
        expect(exRow).toMatchObject({
            workout_log_id: 'log-1', exercise_id: 'bench', exercise_order: 1, notes: 'Bench Press',
            exercise_notes: 'felt good', total_sets: 1, total_reps: 10, max_weight: 135,
        });
        expect(exRow.sets[0]).toEqual({ set_number: 1, reps: 10, weight: 135, weight_unit: 'lbs', is_pr: true });
        expect(data.log.id).toBe('log-1');
        expect(data.log.exercises[0]).toEqual({
            exercise_id: 'bench', name: 'Bench Press',
            sets: [{ weight: 135, reps: 10, weight_unit: 'lbs', rpe: undefined, isPr: true }],
        });
    });

    it("GET returns the caller's logs in the denormalised shape, ignoring traineeId", async () => {
        signedIn();
        const q = chain({
            data: [{
                id: 'log-1', user_id: USER, date: '2026-09-06',
                exercise_logs: [
                    { exercise_id: 'squat', exercise_order: 2, notes: 'Squat', sets: [{ set_number: 1, reps: 5, weight: 225, weight_unit: 'lbs' }] },
                    { exercise_id: 'bench', exercise_order: 1, notes: null, sets: [] },
                ],
            }],
            error: null,
        });
        mockFrom.mockReturnValue(q);

        const res = await GET(new Request('http://localhost/api/logs?traineeId=someone-else'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(q.select).toHaveBeenCalledWith('*, exercise_logs(*)');
        expect(q.eq).toHaveBeenCalledWith('user_id', USER);
        expect(data.logs).toHaveLength(1);
        expect(data.logs[0]).not.toHaveProperty('exercise_logs');
        expect(data.logs[0].exercises.map((e: { name: string }) => e.name)).toEqual(['bench', 'Squat']);
        expect(data.logs[0].exercises[1].sets[0]).toMatchObject({ weight: 225, reps: 5, isPr: false });
    });
});
