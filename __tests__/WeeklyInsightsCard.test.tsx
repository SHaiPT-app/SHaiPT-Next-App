import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WeeklyInsightsCard from '@/components/WeeklyInsightsCard';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: new Proxy(
            {},
            {
                get: (_target: unknown, prop: string) => {
                    return React.forwardRef(
                        (
                            { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
                            ref: React.Ref<HTMLElement>
                        ) => {
                            // Filter out framer-motion specific props
                            const filtered: Record<string, unknown> = {};
                            for (const [key, value] of Object.entries(props)) {
                                if (
                                    ![
                                        'variants',
                                        'initial',
                                        'animate',
                                        'exit',
                                        'transition',
                                        'whileHover',
                                        'whileTap',
                                        'custom',
                                    ].includes(key)
                                ) {
                                    filtered[key] = value;
                                }
                            }
                            return React.createElement(
                                prop,
                                { ...filtered, ref },
                                children
                            );
                        }
                    );
                },
            }
        ),
        AnimatePresence: ({
            children,
        }: {
            children: React.ReactNode;
        }) => children,
    };
});

const mockInsight = {
    id: 'insight-123',
    user_id: 'user-1',
    week_start: '2025-01-20',
    week_end: '2025-01-26',
    adherence: {
        planned_workouts: 4,
        completed_workouts: 3,
        adherence_percentage: 75,
        summary: 'You completed 3 out of 4 planned workouts this week.',
    },
    strength_trends: {
        trending_up: ['Bench Press', 'Squat'],
        trending_down: ['Deadlift'],
        summary: 'Bench and squat improving. Deadlift has declined slightly.',
    },
    plateaus: {
        exercises: ['Overhead Press'],
        summary: 'Your overhead press has stalled for 3 weeks.',
    },
    recommendations: [
        'Add 5 lbs to bench press',
        'Focus on overhead press accessories',
        'Hit all 4 planned sessions next week',
    ],
    overall_summary:
        'Solid week with good strength gains in key lifts.',
    generated_at: '2025-01-26T10:00:00Z',
};

const mockLogs = [
    {
        id: 'log-1',
        date: '2025-01-22',
        exercises: [
            {
                name: 'Bench Press',
                sets: [
                    { weight: 185, reps: 5, weight_unit: 'lbs' },
                    { weight: 185, reps: 5, weight_unit: 'lbs' },
                ],
            },
        ],
    },
    {
        id: 'log-2',
        date: '2025-01-24',
        exercises: [
            {
                name: 'Squat',
                sets: [
                    { weight: 225, reps: 5, weight_unit: 'lbs' },
                ],
            },
        ],
    },
];

describe('WeeklyInsightsCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        global.fetch = jest.fn(
            () => new Promise(() => {})
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);
        expect(screen.getByText('Analyzing your week...')).toBeInTheDocument();
    });

    it('renders insight data after fetch', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(
                screen.getByText('Solid week with good strength gains in key lifts.')
            ).toBeInTheDocument();
        });

        expect(screen.getByText('Weekly AI Insights')).toBeInTheDocument();
        expect(screen.getByText('3/4 workouts')).toBeInTheDocument();
    });

    it('renders strength trend tags', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(screen.getByText(/Bench Press/)).toBeInTheDocument();
        });

        expect(screen.getByText(/Squat/)).toBeInTheDocument();
        expect(screen.getByText(/Deadlift/)).toBeInTheDocument();
    });

    it('shows expanded details when clicking "Show details"', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(screen.getByText('Show details')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Show details'));

        expect(screen.getByText('Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Add 5 lbs to bench press')).toBeInTheDocument();
        expect(
            screen.getByText('Focus on overhead press accessories')
        ).toBeInTheDocument();
        expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('renders error state and retry button', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                json: () =>
                    Promise.resolve({ error: 'Server error' }),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
        });

        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls the API with correct payload', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/ai-coach/weekly-insights',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        const callBody = JSON.parse(
            (global.fetch as jest.Mock).mock.calls[0][1].body
        );
        expect(callBody.userId).toBe('user-1');
        expect(callBody.workoutLogs).toHaveLength(2);
        expect(callBody.workoutLogs[0].exercises[0].name).toBe('Bench Press');
    });

    it('retries fetch on retry button click', async () => {
        let callCount = 0;
        global.fetch = jest.fn(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: 'Temporary error' }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            });
        }) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(screen.getByText('Temporary error')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(
                screen.getByText('Solid week with good strength gains in key lifts.')
            ).toBeInTheDocument();
        });
    });

    it('shows plateaus section in expanded view', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockInsight),
            })
        ) as jest.Mock;

        render(<WeeklyInsightsCard userId="user-1" logs={mockLogs} />);

        await waitFor(() => {
            expect(screen.getByText('Show details')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Show details'));

        expect(screen.getByText('Plateaus Detected')).toBeInTheDocument();
        expect(
            screen.getByText('Your overhead press has stalled for 3 weeks.')
        ).toBeInTheDocument();
    });
});
