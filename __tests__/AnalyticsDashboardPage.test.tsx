import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: mockBack,
    }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
            const filteredProps = { ...props }
            delete filteredProps.variants
            delete filteredProps.initial
            delete filteredProps.animate
            delete filteredProps.exit
            delete filteredProps.transition
            delete filteredProps.whileHover
            delete filteredProps.whileTap
            return <div {...filteredProps}>{children}</div>
        },
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

// Mock supabase
const mockFrom = jest.fn()

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
    },
}))

// Mock date-fns to control output
jest.mock('date-fns', () => {
    const actual = jest.requireActual('date-fns')
    return {
        ...actual,
        formatDistanceToNow: jest.fn(() => '3 days ago'),
    }
})

import AnalyticsDashboardPage from '@/app/dashboard/analytics/page'
import type { PersonalRecord, ExerciseLog } from '@/lib/types'

// ============================================
// TEST DATA
// ============================================

const mockExerciseLogs: Partial<ExerciseLog>[] = [
    {
        id: 'el-1',
        workout_log_id: 'log-1',
        exercise_id: 'bench-press',
        exercise_order: 1,
        sets: [
            { set_number: 1, reps: 10, weight: 135, weight_unit: 'lbs' },
            { set_number: 2, reps: 8, weight: 155, weight_unit: 'lbs' },
            { set_number: 3, reps: 6, weight: 175, weight_unit: 'lbs', rpe: 8 },
        ],
    },
    {
        id: 'el-2',
        workout_log_id: 'log-1',
        exercise_id: 'squat',
        exercise_order: 2,
        sets: [
            { set_number: 1, reps: 8, weight: 225, weight_unit: 'lbs', is_warmup: true },
            { set_number: 2, reps: 5, weight: 275, weight_unit: 'lbs', rpe: 9 },
        ],
    },
]

const mockWorkoutLogs = [
    {
        id: 'log-1',
        user_id: 'user-1',
        date: '2026-01-20',
        started_at: '2026-01-20T10:00:00Z',
        finished_at: '2026-01-20T11:15:00Z',
        total_duration_seconds: 4500,
        notes: 'Great push day',
        exercise_logs: mockExerciseLogs,
    },
    {
        id: 'log-2',
        user_id: 'user-1',
        date: '2026-01-18',
        started_at: '2026-01-18T09:00:00Z',
        finished_at: '2026-01-18T10:00:00Z',
        total_duration_seconds: 3600,
        notes: null,
        exercise_logs: [],
    },
]

const mockPersonalRecords: Partial<PersonalRecord>[] = [
    {
        id: 'pr-1',
        user_id: 'user-1',
        exercise_id: 'bench-press',
        max_weight: 225,
        max_reps: 12,
        max_volume: 2700,
        achieved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (recent)
        is_current: true,
    },
    {
        id: 'pr-2',
        user_id: 'user-1',
        exercise_id: 'squat',
        max_weight: 315,
        max_reps: 8,
        max_volume: 2520,
        achieved_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago (not recent)
        is_current: true,
    },
]

const mockExercises = [
    { exercise_id: 'bench-press', name: 'Bench Press', body_parts: ['chest'], target_muscles: ['pectorals'], equipments: ['barbell'] },
    { exercise_id: 'squat', name: 'Barbell Squat', body_parts: ['legs'], target_muscles: ['quadriceps'], equipments: ['barbell'] },
]

// ============================================
// HELPERS
// ============================================

function setupSupabaseMock({
    logs = mockWorkoutLogs,
    prs = mockPersonalRecords,
    exercises = mockExercises,
}: {
    logs?: unknown[]
    prs?: unknown[]
    exercises?: unknown[]
} = {}) {
    mockFrom.mockImplementation((table: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chain: Record<string, any> = {}

        chain.select = jest.fn().mockReturnValue(chain)
        chain.eq = jest.fn().mockReturnValue(chain)
        chain.in = jest.fn().mockReturnValue(chain)
        chain.order = jest.fn().mockReturnValue(chain)
        chain.limit = jest.fn().mockReturnValue(chain)
        chain.single = jest.fn().mockReturnValue(chain)

        if (table === 'workout_logs') {
            chain.limit = jest.fn().mockResolvedValue({ data: logs, error: null })
            chain.order = jest.fn().mockReturnValue({ ...chain, limit: chain.limit })
            chain.eq = jest.fn().mockReturnValue({ ...chain, order: chain.order })
            chain.select = jest.fn().mockReturnValue({ ...chain, eq: chain.eq })
        } else if (table === 'personal_records') {
            chain.order = jest.fn().mockResolvedValue({ data: prs, error: null })
            // Build chain: from -> select -> eq(user_id) -> eq(is_current) -> order
            const eqCurrent = jest.fn().mockReturnValue({ ...chain, order: chain.order })
            const eqUser = jest.fn().mockReturnValue({ ...chain, eq: eqCurrent })
            chain.select = jest.fn().mockReturnValue({ ...chain, eq: eqUser })
        } else if (table === 'exercises') {
            chain.in = jest.fn().mockResolvedValue({ data: exercises, error: null })
            chain.select = jest.fn().mockReturnValue({ ...chain, in: chain.in })
        }

        return chain
    })
}

// ============================================
// TESTS
// ============================================

describe('AnalyticsDashboardPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFrom.mockReset()

        Storage.prototype.getItem = jest.fn((key: string) => {
            if (key === 'user') {
                return JSON.stringify({
                    id: 'user-1',
                    email: 'test@example.com',
                    full_name: 'Test User',
                })
            }
            return null
        })
    })

    it('redirects to landing page if no user in localStorage', () => {
        Storage.prototype.getItem = jest.fn(() => null)
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('renders the page header with title', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('Analytics')).toBeInTheDocument()
        })

        expect(screen.getByText('Workout history and personal records')).toBeInTheDocument()
    })

    it('renders the back button that navigates back', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('Analytics')).toBeInTheDocument()
        })

        const backButton = screen.getByText(/Back/)
        fireEvent.click(backButton)

        expect(mockBack).toHaveBeenCalled()
    })

    it('renders personal records section header', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('Personal Records')).toBeInTheDocument()
        })
    })

    it('renders workout history section header', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('Workout History')).toBeInTheDocument()
        })
    })

    it('shows empty state for personal records when none exist', async () => {
        setupSupabaseMock({ prs: [] })

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText(/No personal records yet/)).toBeInTheDocument()
        })
    })

    it('shows empty state for workout history when none exist', async () => {
        setupSupabaseMock({ logs: [] })

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText(/No workouts recorded yet/)).toBeInTheDocument()
        })
    })

    it('displays personal record exercise names', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getAllByText('Bench Press').length).toBeGreaterThanOrEqual(1)
        })

        expect(screen.getAllByText('Barbell Squat').length).toBeGreaterThanOrEqual(1)
    })

    it('displays PR max weight values', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('225')).toBeInTheDocument()
        })

        expect(screen.getByText('315')).toBeInTheDocument()
    })

    it('displays NEW PR badge for recent personal records', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            const badges = screen.getAllByTestId('pr-badge')
            expect(badges.length).toBeGreaterThanOrEqual(1)
        })
    })

    it('displays workout log dates', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            // The date "January 20, 2026" should appear formatted
            expect(screen.getByText(/Jan 20, 2026/)).toBeInTheDocument()
        })
    })

    it('displays workout notes', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('Great push day')).toBeInTheDocument()
        })
    })

    it('displays workout duration', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('1h 15m')).toBeInTheDocument()
        })
    })

    it('displays exercise and set counts as stats pills', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText('2 exercises')).toBeInTheDocument()
        })

        expect(screen.getByText('5 sets')).toBeInTheDocument()
    })

    it('expands workout details when clicked', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText(/Jan 20, 2026/)).toBeInTheDocument()
        })

        // Click the workout card using data-testid
        const workoutCard = screen.getByTestId('workout-log-log-1')

        await act(async () => {
            fireEvent.click(workoutCard)
        })

        // Should show set column headers in expanded view
        expect(screen.getAllByText('Set').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Weight').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Reps').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('RPE').length).toBeGreaterThanOrEqual(1)
        // Check for actual set data - weight values from the exercise logs
        expect(screen.getByText('135lbs')).toBeInTheDocument()
        expect(screen.getByText('175lbs')).toBeInTheDocument()
    })

    it('collapses expanded workout when clicked again', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            expect(screen.getByText(/Jan 20, 2026/)).toBeInTheDocument()
        })

        const workoutCard = screen.getByTestId('workout-log-log-1')

        // Expand
        await act(async () => {
            fireEvent.click(workoutCard)
        })

        expect(screen.getByText('135lbs')).toBeInTheDocument()

        // Collapse
        await act(async () => {
            fireEvent.click(workoutCard)
        })

        expect(screen.queryByText('135lbs')).not.toBeInTheDocument()
    })

    it('shows Max Weight, Max Reps, Max Volume labels in PR cards', async () => {
        setupSupabaseMock()

        render(<AnalyticsDashboardPage />)

        await waitFor(() => {
            const weightLabels = screen.getAllByText('Max Weight')
            expect(weightLabels.length).toBeGreaterThanOrEqual(1)
        })

        expect(screen.getAllByText('Max Reps').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Max Volume').length).toBeGreaterThanOrEqual(1)
    })
})
