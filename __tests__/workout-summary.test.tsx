import { render, screen, waitFor } from '@testing-library/react';
import WorkoutExecutionPage from '@/app/workout/[sessionId]/page';

// Helper to create a mock Response-like object for jsdom environment
function mockResponse(body: object, init?: { status?: number }) {
    return {
        ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
        status: init?.status ?? 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: new Map([['Content-Type', 'application/json']]),
    };
}

// ─── Mock data ───────────────────────────────────────────────────────

const mockSession = {
    id: 'session-1',
    creator_id: 'user-1',
    name: 'Push Day',
    description: 'Upper body push workout',
    exercises: [
        {
            exercise_id: 'ex-1',
            sets: [
                { reps: '10', weight: '135', rest_seconds: 90 },
            ],
        },
    ],
    tags: ['push', 'chest'],
    is_template: true,
    is_public: true,
};

const mockExercise1 = {
    exercise_id: 'ex-1',
    name: 'Bench Press',
    gif_url: 'https://example.com/bench.gif',
    body_parts: ['chest'],
    target_muscles: ['pectorals'],
    equipments: ['barbell'],
};

const mockProfile = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    preferred_weight_unit: 'lbs' as const,
    auto_post_workouts: true,
    workout_privacy: 'public' as const,
    fitness_goals: ['muscle gain', 'strength'],
};

const mockWorkoutLog = {
    id: 'log-1',
    user_id: 'user-1',
    session_id: 'session-1',
    date: '2026-01-27',
    started_at: new Date().toISOString(),
};

const mockExerciseLog = {
    id: 'elog-1',
    workout_log_id: 'log-1',
    exercise_id: 'ex-1',
    exercise_order: 1,
    sets: [],
};

// ─── Mocks ───────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useParams: () => ({ sessionId: 'session-1' }),
    useRouter: () => ({ push: mockPush }),
}));

const mockDb = {
    workoutSessions: { getById: jest.fn() },
    exercises: { getById: jest.fn() },
    workoutLogs: { create: jest.fn(), update: jest.fn() },
    exerciseLogs: { create: jest.fn(), update: jest.fn() },
    personalRecords: { getByExercise: jest.fn(), create: jest.fn(), update: jest.fn() },
    activityPosts: { create: jest.fn() },
    profiles: { getById: jest.fn() },
};

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        workoutSessions: { getById: (...args: unknown[]) => mockDb.workoutSessions.getById(...args) },
        exercises: { getById: (...args: unknown[]) => mockDb.exercises.getById(...args) },
        workoutLogs: {
            create: (...args: unknown[]) => mockDb.workoutLogs.create(...args),
            update: (...args: unknown[]) => mockDb.workoutLogs.update(...args),
        },
        exerciseLogs: {
            create: (...args: unknown[]) => mockDb.exerciseLogs.create(...args),
            update: (...args: unknown[]) => mockDb.exerciseLogs.update(...args),
        },
        personalRecords: {
            getByExercise: (...args: unknown[]) => mockDb.personalRecords.getByExercise(...args),
            create: (...args: unknown[]) => mockDb.personalRecords.create(...args),
            update: (...args: unknown[]) => mockDb.personalRecords.update(...args),
        },
        activityPosts: { create: (...args: unknown[]) => mockDb.activityPosts.create(...args) },
        profiles: { getById: (...args: unknown[]) => mockDb.profiles.getById(...args) },
    },
}));

jest.mock('@/lib/animations', () => ({
    fadeInUp: {},
    staggerContainer: {},
    scaleIn: {},
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
    const React = require('react');
    const motionHandler = (tag: string) =>
        React.forwardRef(({ children, ...props }: any, ref: any) => {
            const filtered: Record<string, unknown> = {};
            for (const key of Object.keys(props)) {
                if (
                    !['initial', 'animate', 'exit', 'variants', 'transition', 'whileHover', 'whileTap', 'whileInView'].includes(key)
                ) {
                    filtered[key] = props[key];
                }
            }
            return React.createElement(tag, { ...filtered, ref }, children);
        });
    return {
        motion: {
            div: motionHandler('div'),
            form: motionHandler('form'),
        },
        AnimatePresence: ({ children }: any) => children,
    };
});

// ─── Setup ───────────────────────────────────────────────────────────

function setupMocks() {
    Storage.prototype.getItem = jest.fn((key: string) => {
        if (key === 'user') return JSON.stringify(mockProfile);
        return null;
    });
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();

    mockDb.workoutSessions.getById.mockResolvedValue(mockSession);
    mockDb.exercises.getById.mockResolvedValue(mockExercise1);
    mockDb.workoutLogs.create.mockResolvedValue(mockWorkoutLog);
    mockDb.workoutLogs.update.mockResolvedValue({});
    mockDb.exerciseLogs.create.mockImplementation((data: any) =>
        Promise.resolve({ ...mockExerciseLog, sets: data.sets || [] })
    );
    mockDb.exerciseLogs.update.mockResolvedValue({});
    mockDb.personalRecords.getByExercise.mockResolvedValue([]);
    mockDb.personalRecords.create.mockResolvedValue({});
    mockDb.personalRecords.update.mockResolvedValue({});
    mockDb.activityPosts.create.mockResolvedValue({});
    mockDb.profiles.getById.mockResolvedValue(mockProfile);
}

// Helper to complete a workout and reach the summary screen
async function completeWorkoutAndReachSummary() {
    render(<WorkoutExecutionPage />);

    // Wait for exercise to load
    await waitFor(() => {
        expect(screen.getByText('Bench Press')).toBeInTheDocument();
    });

    // Log the single set
    const { fireEvent } = require('@testing-library/react');
    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: '135' } });
    fireEvent.change(screen.getByLabelText(/Reps/), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Log Set'));

    // Wait for Finish Workout button
    await waitFor(() => {
        expect(screen.getByText('Finish Workout')).toBeInTheDocument();
    });

    // Click Finish Workout
    fireEvent.click(screen.getByText('Finish Workout'));

    // Wait for summary screen
    await waitFor(() => {
        expect(screen.getByText('Workout Complete')).toBeInTheDocument();
    });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('WorkoutSummary - AI Feedback', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        jest.clearAllMocks();
        setupMocks();

        // Mock fetch for AI feedback
        global.fetch = jest.fn().mockResolvedValue(
            mockResponse({
                feedback: 'Great workout session. Your bench press volume was solid.',
                recommendations: [
                    'Try increasing weight by 5 lbs next session',
                    'Focus on controlled eccentric phase',
                    'Add a warm-up set before working sets',
                ],
            })
        );
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('shows loading state while fetching AI feedback', async () => {
        // Make fetch hang to observe loading state
        (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

        await completeWorkoutAndReachSummary();

        expect(screen.getByText('Analyzing your workout...')).toBeInTheDocument();
    });

    it('displays AI feedback after loading', async () => {
        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(screen.getByText('Great workout session. Your bench press volume was solid.')).toBeInTheDocument();
        });
    });

    it('displays AI recommendations', async () => {
        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(screen.getByText('Recommendations')).toBeInTheDocument();
        });

        expect(screen.getByText('Try increasing weight by 5 lbs next session')).toBeInTheDocument();
        expect(screen.getByText('Focus on controlled eccentric phase')).toBeInTheDocument();
        expect(screen.getByText('Add a warm-up set before working sets')).toBeInTheDocument();
    });

    it('calls the workout-summary API with correct data', async () => {
        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/ai-coach/workout-summary',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        // Verify body contents
        const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(callBody.sessionName).toBe('Push Day');
        expect(callBody.exercises).toHaveLength(1);
        expect(callBody.exercises[0].name).toBe('Bench Press');
        expect(callBody.weightUnit).toBe('lbs');
        expect(callBody.userGoals).toEqual(['muscle gain', 'strength']);
    });

    it('shows error message when AI feedback fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue(
            mockResponse({ error: 'Internal error' }, { status: 500 })
        );

        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(screen.getByText('Could not load AI feedback. Your workout data has been saved.')).toBeInTheDocument();
        });
    });

    it('shows error message when fetch throws', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(screen.getByText('Could not load AI feedback. Your workout data has been saved.')).toBeInTheDocument();
        });
    });

    it('displays workout stats correctly', async () => {
        await completeWorkoutAndReachSummary();

        expect(screen.getByText('Total Volume')).toBeInTheDocument();
        expect(screen.getByText('Total Sets')).toBeInTheDocument();
        expect(screen.getByText('Total Reps')).toBeInTheDocument();
        expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('shows AI Coach Feedback section heading', async () => {
        await completeWorkoutAndReachSummary();

        expect(screen.getByText('AI Coach Feedback')).toBeInTheDocument();
    });

    it('creates activity post when auto_post_workouts is enabled', async () => {
        await completeWorkoutAndReachSummary();

        expect(mockDb.activityPosts.create).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                post_type: 'workout_completed',
                content: 'Completed Push Day',
                visibility: 'public',
            })
        );
    });

    it('does not create activity post when auto_post_workouts is false', async () => {
        const profileNoAutoPost = { ...mockProfile, auto_post_workouts: false };
        Storage.prototype.getItem = jest.fn((key: string) => {
            if (key === 'user') return JSON.stringify(profileNoAutoPost);
            return null;
        });

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        const { fireEvent } = require('@testing-library/react');
        fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: '135' } });
        fireEvent.change(screen.getByLabelText(/Reps/), { target: { value: '10' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(screen.getByText('Finish Workout')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Finish Workout'));

        await waitFor(() => {
            expect(screen.getByText('Workout Complete')).toBeInTheDocument();
        });

        expect(mockDb.activityPosts.create).not.toHaveBeenCalled();
    });

    it('shows PRs section when PRs are achieved', async () => {
        // Set up so that there are no existing PRs (meaning a new PR will be detected)
        mockDb.personalRecords.getByExercise.mockResolvedValue([]);

        await completeWorkoutAndReachSummary();

        await waitFor(() => {
            expect(screen.getByText('Personal Records')).toBeInTheDocument();
        });
    });

    it('shows the Done button that navigates home', async () => {
        await completeWorkoutAndReachSummary();

        const { fireEvent } = require('@testing-library/react');
        const doneBtn = screen.getByText('Done');
        expect(doneBtn).toBeInTheDocument();

        fireEvent.click(doneBtn);
        expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('shows volume with correct weight unit', async () => {
        await completeWorkoutAndReachSummary();

        // Volume display should include the weight unit
        await waitFor(() => {
            // The stat shows "1,350 lbs" (135 * 10 = 1350)
            expect(screen.getByText('1,350 lbs')).toBeInTheDocument();
        });
    });
});
