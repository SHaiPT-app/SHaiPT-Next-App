/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/plans/route';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';

import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
    },
}));

const mockDbAdminGetById = jest.fn();

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        workoutPlans: {
            getByTrainee: jest.fn(),
            getByTrainer: jest.fn(),
            create: jest.fn(),
        },
        profiles: {
            getById: jest.fn(),
        },
    },
    dbAdmin: {
        profiles: {
            getById: (...args: unknown[]) => mockDbAdminGetById(...args),
        },
    },
}));

describe('/api/plans', () => {
    const mockSupabase = {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    describe('GET', () => {
        it('returns plans for authenticated user', async () => {
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', user_metadata: { role: 'trainee' } } },
                error: null
            });
            (db.profiles.getById as jest.Mock).mockResolvedValue({ role: 'trainee' });

            // Mock supabase.from chain
            const mockSelect = jest.fn().mockReturnThis();
            const mockEq = jest.fn().mockReturnThis();
            const mockOrder = jest.fn().mockResolvedValue({ data: [{ id: 'plan-1', name: 'Plan 1' }], error: null });

            (createClient as jest.Mock).mockReturnValue({
                from: jest.fn(() => ({
                    select: mockSelect,
                    eq: mockEq,
                    order: mockOrder,
                })),
            });

            const req = new Request('http://localhost:3000/api/plans?traineeId=f47ac10b-58cc-4372-a567-0e02b2c3d479', {
                method: 'GET',
            });
            const response = await GET(req);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.plans).toHaveLength(1);
            expect(data.plans[0].name).toBe('Plan 1');
        });
    });

    describe('POST', () => {
        beforeEach(() => {
            process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
        });

        it('creates a new plan', async () => {
            const trainerId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
            const traineeId = '550e8400-e29b-41d4-a716-446655440000';

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
                data: { user: { id: trainerId } },
                error: null
            });
            // Mock dbAdmin.profiles.getById for trainer and trainee validation
            mockDbAdminGetById
                .mockResolvedValueOnce({ id: trainerId, username: 'trainer' })
                .mockResolvedValueOnce({ id: traineeId, username: 'trainee' });

            // Mock supabase.from chain for insert
            const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'new-plan', name: 'New Plan' }, error: null });
            const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
            const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

            (createClient as jest.Mock).mockReturnValue({
                from: jest.fn(() => ({
                    insert: mockInsert,
                    select: mockSelect,
                    single: mockSingle,
                })),
            });

            const req = new Request('http://localhost:3000/api/plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: 'New Plan', trainee_id: traineeId, trainer_id: trainerId }),
            });

            const response = await POST(req);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.plan.id).toBe('new-plan');
        });
    });
});
