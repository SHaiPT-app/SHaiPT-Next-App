import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkoutLogger from '@/components/WorkoutLogger';

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
            ],
        },
        {
            exercise_id: 'ex-2',
            sets: [
                { reps: '12', weight: '30', rest_seconds: 60 },
            ],
        },
    ],
    tags: ['push'],
    is_template: true,
    is_public: false,
};

const mockPlan = {
    id: 'plan-1',
    creator_id: 'user-1',
    name: 'Hypertrophy Block',
    description: '4-week hypertrophy plan',
    duration_weeks: 4,
};

const mockPlanSession = {
    id: 'ps-1',
    plan_id: 'plan-1',
    session_id: 'session-1',
    day_number: 1,
    session: mockSession,
};

const mockAssignment = {
    id: 'assign-1',
    plan_id: 'plan-1',
    user_id: 'user-1',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '2026-12-31',
    is_active: true,
};

const mockExercise1 = {
    exercise_id: 'ex-1',
    name: 'Bench Press',
    gif_url: null,
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

// ─── Mocks ───────────────────────────────────────────────────────────

const mockDb = {
    trainingPlans: {
        getByCreator: jest.fn(),
        getById: jest.fn(),
    },
    trainingPlanSessions: {
        getByPlan: jest.fn(),
    },
    trainingPlanAssignments: {
        getActiveByUser: jest.fn(),
    },
    workoutSessions: {
        getByCreator: jest.fn(),
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
        trainingPlans: {
            getByCreator: (...args: unknown[]) => mockDb.trainingPlans.getByCreator(...args),
            getById: (...args: unknown[]) => mockDb.trainingPlans.getById(...args),
        },
        trainingPlanSessions: {
            getByPlan: (...args: unknown[]) => mockDb.trainingPlanSessions.getByPlan(...args),
        },
        trainingPlanAssignments: {
            getActiveByUser: (...args: unknown[]) => mockDb.trainingPlanAssignments.getActiveByUser(...args),
        },
        workoutSessions: {
            getByCreator: (...args: unknown[]) => mockDb.workoutSessions.getByCreator(...args),
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

// Mock PoseDetectionOverlay
jest.mock('@/components/PoseDetectionOverlay', () => {
    return function MockPoseDetectionOverlay() {
        return <div data-testid="pose-detection-overlay">PoseDetectionOverlay</div>;
    };
});

// ─── Setup helpers ──────────────────────────────────────────────────

const FORM_CHECKER_PREF_KEY = 'shaipt_form_checker_enabled';

function setupDefaultMocks() {
    mockDb.trainingPlans.getByCreator.mockResolvedValue([mockPlan]);
    mockDb.trainingPlans.getById.mockResolvedValue(mockPlan);
    mockDb.trainingPlanSessions.getByPlan.mockResolvedValue([mockPlanSession]);
    mockDb.trainingPlanAssignments.getActiveByUser.mockResolvedValue(mockAssignment);
    mockDb.workoutSessions.getByCreator.mockResolvedValue([mockSession]);
    mockDb.workoutSessions.getById.mockResolvedValue(mockSession);
    mockDb.exercises.getById.mockImplementation((id: string) => {
        if (id === 'ex-1') return Promise.resolve(mockExercise1);
        if (id === 'ex-2') return Promise.resolve(mockExercise2);
        return Promise.resolve(null);
    });
    mockDb.workoutLogs.create.mockResolvedValue({
        id: 'log-1',
        user_id: 'user-1',
        session_id: 'session-1',
        date: '2026-01-27',
        started_at: new Date().toISOString(),
    });
}

function resetMocks() {
    Object.values(mockDb).forEach(group => {
        Object.values(group).forEach(fn => {
            if (typeof fn === 'function') (fn as jest.Mock).mockReset();
        });
    });
    localStorage.clear();
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('WorkoutLogger - Start Flow', () => {
    beforeEach(() => {
        resetMocks();
        setupDefaultMocks();
    });

    describe('Today\'s Workout Card', () => {
        it('shows today\'s workout card when user has an active plan assignment', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('today-workout-card')).toBeInTheDocument();
            });

            const todayCard = screen.getByTestId('today-workout-card');
            expect(todayCard).toHaveTextContent('Push Day');
            expect(todayCard).toHaveTextContent('Hypertrophy Block');
            expect(todayCard).toHaveTextContent('Day 1');
        });

        it('does not show today\'s workout card when no active assignment exists', async () => {
            mockDb.trainingPlanAssignments.getActiveByUser.mockResolvedValue(null);

            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByText('Start Workout')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('today-workout-card')).not.toBeInTheDocument();
        });

        it('navigates to form checker prompt when clicking Start on today\'s workout', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('form-checker-prompt')).toBeInTheDocument();
            });
        });
    });

    describe('Form Checker Prompt', () => {
        it('shows form checker prompt with session info before starting workout', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('form-checker-prompt')).toBeInTheDocument();
            });

            // Should show session name
            expect(screen.getByText('Push Day')).toBeInTheDocument();

            // Should show the form checker toggle
            expect(screen.getByTestId('form-checker-toggle')).toBeInTheDocument();

            // Should show start button
            expect(screen.getByTestId('confirm-start-workout-btn')).toBeInTheDocument();
        });

        it('toggle defaults to off when no saved preference', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                const toggle = screen.getByTestId('form-checker-toggle');
                expect(toggle).toHaveAttribute('aria-checked', 'false');
            });
        });

        it('toggle defaults to on when saved preference is true', async () => {
            localStorage.setItem(FORM_CHECKER_PREF_KEY, 'true');

            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                const toggle = screen.getByTestId('form-checker-toggle');
                expect(toggle).toHaveAttribute('aria-checked', 'true');
            });
        });

        it('clicking the toggle changes its state and saves to localStorage', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('form-checker-toggle')).toBeInTheDocument();
            });

            const toggle = screen.getByTestId('form-checker-toggle');
            expect(toggle).toHaveAttribute('aria-checked', 'false');

            // Toggle on
            fireEvent.click(toggle);
            expect(toggle).toHaveAttribute('aria-checked', 'true');
            expect(localStorage.getItem(FORM_CHECKER_PREF_KEY)).toBe('true');

            // Toggle off
            fireEvent.click(toggle);
            expect(toggle).toHaveAttribute('aria-checked', 'false');
            expect(localStorage.getItem(FORM_CHECKER_PREF_KEY)).toBe('false');
        });

        it('displays exercise preview rows in the session overview', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByText('Bench Press')).toBeInTheDocument();
            });

            expect(screen.getByText('Lateral Raise')).toBeInTheDocument();
        });

        it('Back button returns to selection view', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('form-checker-prompt')).toBeInTheDocument();
            });

            // Click back
            fireEvent.click(screen.getByText(/Back/));

            await waitFor(() => {
                expect(screen.getByTestId('today-workout-card')).toBeInTheDocument();
            });
        });
    });

    describe('Starting the workout', () => {
        it('clicking Start Workout on the form checker prompt proceeds to active workout', async () => {
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('confirm-start-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('confirm-start-workout-btn'));

            // Should transition to active workout
            await waitFor(() => {
                // The active workout shows the exercise name in the exercise card
                expect(screen.getByText('Bench Press')).toBeInTheDocument();
            });

            // Should have called workoutLogs.create to initialize the workout
            expect(mockDb.workoutLogs.create).toHaveBeenCalled();
        });
    });

    describe('Preference persistence', () => {
        it('saves form checker preference to localStorage', () => {
            localStorage.setItem(FORM_CHECKER_PREF_KEY, 'true');
            expect(localStorage.getItem(FORM_CHECKER_PREF_KEY)).toBe('true');

            localStorage.setItem(FORM_CHECKER_PREF_KEY, 'false');
            expect(localStorage.getItem(FORM_CHECKER_PREF_KEY)).toBe('false');
        });

        it('persists preference across component renders', async () => {
            // First render: toggle on
            const { unmount } = render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('form-checker-toggle')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('form-checker-toggle'));
            expect(localStorage.getItem(FORM_CHECKER_PREF_KEY)).toBe('true');

            unmount();

            // Second render: should load saved preference
            render(<WorkoutLogger userId="user-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('start-today-workout-btn')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-today-workout-btn'));

            await waitFor(() => {
                const toggle = screen.getByTestId('form-checker-toggle');
                expect(toggle).toHaveAttribute('aria-checked', 'true');
            });
        });
    });
});
