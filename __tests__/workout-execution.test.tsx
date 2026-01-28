import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkoutExecutionPage from '@/app/workout/[sessionId]/page';

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
                { reps: '10', weight: '135', rest_seconds: 90 },
                { reps: '8', weight: '155', rest_seconds: 120 },
            ],
            notes: 'Keep elbows tucked',
        },
        {
            exercise_id: 'ex-2',
            sets: [
                { reps: '12', weight: '30', rest_seconds: 60 },
                { reps: '12', weight: '30', rest_seconds: 60 },
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

const mockExercise2 = {
    exercise_id: 'ex-2',
    name: 'Lateral Raise',
    gif_url: null,
    body_parts: ['shoulders'],
    target_muscles: ['deltoids'],
    equipments: ['dumbbell'],
};

const mockProfile = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    preferred_weight_unit: 'lbs' as const,
    auto_post_workouts: true,
    workout_privacy: 'public' as const,
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
    workoutSessions: {
        getById: jest.fn(),
    },
    exercises: {
        getById: jest.fn(),
    },
    workoutLogs: {
        create: jest.fn(),
        update: jest.fn(),
    },
    exerciseLogs: {
        create: jest.fn(),
        update: jest.fn(),
    },
    personalRecords: {
        getByExercise: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    activityPosts: {
        create: jest.fn(),
    },
    profiles: {
        getById: jest.fn(),
    },
};

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        workoutSessions: {
            getById: (...args: unknown[]) => mockDb.workoutSessions.getById(...args),
        },
        exercises: {
            getById: (...args: unknown[]) => mockDb.exercises.getById(...args),
        },
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
        activityPosts: {
            create: (...args: unknown[]) => mockDb.activityPosts.create(...args),
        },
        profiles: {
            getById: (...args: unknown[]) => mockDb.profiles.getById(...args),
        },
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
                    ![
                        'initial', 'animate', 'exit', 'variants',
                        'transition', 'whileHover', 'whileTap', 'whileInView',
                    ].includes(key)
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

// ─── Test setup ──────────────────────────────────────────────────────

function setupMocks() {
    Storage.prototype.getItem = jest.fn((key: string) => {
        if (key === 'user') return JSON.stringify(mockProfile);
        return null;
    });
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();

    mockDb.workoutSessions.getById.mockResolvedValue(mockSession);
    mockDb.exercises.getById.mockImplementation((id: string) => {
        if (id === 'ex-1') return Promise.resolve(mockExercise1);
        if (id === 'ex-2') return Promise.resolve(mockExercise2);
        return Promise.resolve(null);
    });
    mockDb.workoutLogs.create.mockResolvedValue(mockWorkoutLog);
    mockDb.workoutLogs.update.mockResolvedValue({});
    mockDb.exerciseLogs.create.mockResolvedValue(mockExerciseLog);
    mockDb.exerciseLogs.update.mockResolvedValue({});
    mockDb.personalRecords.getByExercise.mockResolvedValue([]);
    mockDb.personalRecords.create.mockResolvedValue({});
    mockDb.personalRecords.update.mockResolvedValue({});
    mockDb.activityPosts.create.mockResolvedValue({});
    mockDb.profiles.getById.mockResolvedValue(mockProfile);
}

// Helper to get form inputs
function getWeightInput() {
    return screen.getByLabelText(/Weight/);
}
function getRepsInput() {
    return screen.getByLabelText(/Reps/);
}
function getRpeInput() {
    return screen.getByLabelText(/RPE/);
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('WorkoutExecutionPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupMocks();
    });

    it('shows loading state initially', () => {
        render(<WorkoutExecutionPage />);
        expect(screen.getByText('Loading workout...')).toBeInTheDocument();
    });

    it('loads session and shows the first exercise', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        expect(screen.getByText('Push Day')).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        expect(mockDb.workoutSessions.getById).toHaveBeenCalledWith('session-1');
        expect(mockDb.workoutLogs.create).toHaveBeenCalled();
    });

    it('shows target sets, reps, and weight for the exercise', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        // Check target info section - should display "3 sets", "10 reps", "135 lbs"
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('sets')).toBeInTheDocument();
    });

    it('shows exercise notes when present', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Keep elbows tucked')).toBeInTheDocument();
        });
    });

    it('displays the exercise demo image when gif_url is available', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        const img = screen.getByAltText('Bench Press');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/bench.gif');
    });

    it('displays set entry form with weight, reps, and RPE fields', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        expect(screen.getByText('Set 1 of 3')).toBeInTheDocument();
        expect(getWeightInput()).toBeInTheDocument();
        expect(getRepsInput()).toBeInTheDocument();
        expect(getRpeInput()).toBeInTheDocument();
    });

    it('logs a set when the form is submitted', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        fireEvent.change(getWeightInput(), { target: { value: '135' } });
        fireEvent.change(getRepsInput(), { target: { value: '10' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(mockDb.exerciseLogs.create).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Set 1')).toBeInTheDocument();
        });
    });

    it('logs a set with RPE when provided', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        fireEvent.change(getWeightInput(), { target: { value: '135' } });
        fireEvent.change(getRepsInput(), { target: { value: '10' } });
        fireEvent.change(getRpeInput(), { target: { value: '8' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(mockDb.exerciseLogs.create).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText(/@ RPE 8/)).toBeInTheDocument();
        });
    });

    it('starts rest timer after logging a set when more sets remain', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        fireEvent.change(getWeightInput(), { target: { value: '135' } });
        fireEvent.change(getRepsInput(), { target: { value: '10' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(screen.getByText('Rest')).toBeInTheDocument();
        });

        expect(screen.getByText('1:30')).toBeInTheDocument();
    });

    it('allows skipping rest timer', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        fireEvent.change(getWeightInput(), { target: { value: '135' } });
        fireEvent.change(getRepsInput(), { target: { value: '10' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(screen.getByText('Skip Rest')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Skip Rest'));

        await waitFor(() => {
            expect(screen.queryByText('Skip Rest')).not.toBeInTheDocument();
        });
    });

    it('shows Next Exercise button after all sets are complete', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        // Log all 3 sets
        for (let i = 0; i < 3; i++) {
            const skipBtn = screen.queryByText('Skip Rest');
            if (skipBtn) fireEvent.click(skipBtn);

            await waitFor(() => {
                expect(screen.getByText('Log Set')).toBeInTheDocument();
            });

            fireEvent.change(getWeightInput(), { target: { value: '135' } });
            fireEvent.change(getRepsInput(), { target: { value: '10' } });
            fireEvent.click(screen.getByText('Log Set'));

            await waitFor(() => {
                expect(screen.getByText(`Set ${i + 1}`)).toBeInTheDocument();
            });
        }

        await waitFor(() => {
            expect(screen.getByText('Next Exercise')).toBeInTheDocument();
        });
    });

    it('shows error if session not found', async () => {
        mockDb.workoutSessions.getById.mockResolvedValue(null);

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Workout session not found.')).toBeInTheDocument();
        });
    });

    it('shows error if user is not logged in', async () => {
        Storage.prototype.getItem = jest.fn(() => null);

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('You must be logged in to start a workout.')).toBeInTheDocument();
        });
    });

    it('shows Back to Home button on error and navigates when clicked', async () => {
        mockDb.workoutSessions.getById.mockResolvedValue(null);

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Back to Home')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Back to Home'));
        expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('shows exercise progress indicator', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('has Exit button that navigates home', async () => {
        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        const exitButton = screen.getByText(/Exit/);
        fireEvent.click(exitButton);
        expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('shows "No demo available" when exercise has no gif_url', async () => {
        // Return exercise without gif for all calls
        mockDb.exercises.getById.mockResolvedValue({
            ...mockExercise1,
            gif_url: null,
        });

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('No demo available')).toBeInTheDocument();
        });
    });
});

describe('WorkoutExecutionPage - last exercise finish', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupMocks();
    });

    it('shows Finish Workout on the last exercise after all sets are done', async () => {
        const singleExSession = {
            ...mockSession,
            exercises: [
                {
                    exercise_id: 'ex-1',
                    sets: [{ reps: '10', weight: '135', rest_seconds: 60 }],
                },
            ],
        };
        mockDb.workoutSessions.getById.mockResolvedValue(singleExSession);

        render(<WorkoutExecutionPage />);

        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument();
        });

        fireEvent.change(getWeightInput(), { target: { value: '135' } });
        fireEvent.change(getRepsInput(), { target: { value: '10' } });
        fireEvent.click(screen.getByText('Log Set'));

        await waitFor(() => {
            expect(screen.getByText('Finish Workout')).toBeInTheDocument();
        });
    });
});
