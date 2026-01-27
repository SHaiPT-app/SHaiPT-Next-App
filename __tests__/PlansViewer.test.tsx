import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
    }),
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: { session: { access_token: 'mock-token' } },
            }),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                        })),
                    })),
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                })),
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
        })),
    },
}))

// Mock supabaseDb
const mockGetByCreator = jest.fn()
const mockGetActiveByUser = jest.fn()
const mockGetPlanById = jest.fn()
const mockGetByPlan = jest.fn()
const mockGetSessionById = jest.fn()
const mockGetExerciseById = jest.fn()
const mockUpdateSession = jest.fn()

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        trainingPlans: {
            getByCreator: (...args: unknown[]) => mockGetByCreator(...args),
            getById: (...args: unknown[]) => mockGetPlanById(...args),
        },
        trainingPlanAssignments: {
            getActiveByUser: (...args: unknown[]) => mockGetActiveByUser(...args),
        },
        trainingPlanSessions: {
            getByPlan: (...args: unknown[]) => mockGetByPlan(...args),
        },
        workoutSessions: {
            getById: (...args: unknown[]) => mockGetSessionById(...args),
            update: (...args: unknown[]) => mockUpdateSession(...args),
        },
        exercises: {
            getById: (...args: unknown[]) => mockGetExerciseById(...args),
        },
    },
}))

import PlansViewerPage from '@/app/(main)/plans/page'

const mockPlan = {
    id: 'plan-1',
    creator_id: 'user-1',
    name: 'Test Strength Plan',
    description: 'A 12 week strength program',
    duration_weeks: 12,
    tags: ['schedule:weekly'],
    is_template: true,
    is_public: false,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
}

const mockSession = {
    id: 'session-1',
    creator_id: 'user-1',
    name: 'Upper Body A',
    description: 'Push focused upper body',
    exercises: [
        {
            exercise_id: 'ex-1',
            sets: [
                { reps: '8', weight: '135', rest_seconds: 120 },
                { reps: '8', weight: '135', rest_seconds: 120 },
                { reps: '8', weight: '135', rest_seconds: 120 },
            ],
            notes: 'Control the eccentric',
        },
        {
            exercise_id: 'ex-2',
            sets: [
                { reps: '10', weight: '50', rest_seconds: 90 },
                { reps: '10', weight: '50', rest_seconds: 90 },
            ],
            notes: '',
        },
    ],
    tags: ['upper', 'push'],
    is_template: true,
    is_public: false,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
}

const mockPlanSessions = [
    { id: 'ps-1', plan_id: 'plan-1', session_id: 'session-1', day_number: 1, week_number: 1 },
    { id: 'ps-2', plan_id: 'plan-1', session_id: 'session-1', day_number: 3, week_number: 1 },
]

const mockExercise = {
    exercise_id: 'ex-1',
    name: 'Bench Press',
    body_parts: ['chest'],
    target_muscles: ['pectorals'],
    equipments: ['barbell'],
}

const mockExercise2 = {
    exercise_id: 'ex-2',
    name: 'Dumbbell Fly',
    body_parts: ['chest'],
    target_muscles: ['pectorals'],
    equipments: ['dumbbell'],
}

describe('PlansViewerPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Set up localStorage with user
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

        // Default mock returns
        mockGetSessionById.mockResolvedValue(null)
        mockGetExerciseById.mockResolvedValue(null)
    })

    it('renders empty state when user has no plans', async () => {
        mockGetByCreator.mockResolvedValue([])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('No training plans yet')).toBeInTheDocument()
        })

        expect(screen.getByText('Create Your First Plan')).toBeInTheDocument()
    })

    it('renders plan details when user has a plan', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetPlanById.mockResolvedValue(null)
        mockGetByPlan.mockResolvedValue(mockPlanSessions)
        mockGetSessionById.mockResolvedValue(mockSession)
        mockGetExerciseById.mockImplementation((id: string) => {
            if (id === 'ex-1') return Promise.resolve(mockExercise)
            if (id === 'ex-2') return Promise.resolve(mockExercise2)
            return Promise.resolve(null)
        })

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('Test Strength Plan')).toBeInTheDocument()
        })

        expect(screen.getByText('A 12 week strength program')).toBeInTheDocument()
        expect(screen.getByText('12 Weeks')).toBeInTheDocument()
    })

    it('shows periodization blocks for longer plans', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetByPlan.mockResolvedValue([])

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('Periodization Blocks')).toBeInTheDocument()
        })

        // 12 week plan should have 4 blocks
        expect(screen.getByText('Hypertrophy')).toBeInTheDocument()
        expect(screen.getByText('Strength')).toBeInTheDocument()
        expect(screen.getByText('Endurance')).toBeInTheDocument()
        expect(screen.getByText('Deload')).toBeInTheDocument()
    })

    it('shows weekly day view with day labels', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetByPlan.mockResolvedValue(mockPlanSessions)
        mockGetSessionById.mockResolvedValue(mockSession)
        mockGetExerciseById.mockResolvedValue(mockExercise)

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getAllByText('Upper Body A').length).toBeGreaterThan(0)
        })

        // Rest days should show
        expect(screen.getAllByText('Rest Day').length).toBeGreaterThan(0)
    })

    it('expands day to show exercises when clicked', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetByPlan.mockResolvedValue(mockPlanSessions)
        mockGetSessionById.mockResolvedValue(mockSession)
        mockGetExerciseById.mockImplementation((id: string) => {
            if (id === 'ex-1') return Promise.resolve(mockExercise)
            if (id === 'ex-2') return Promise.resolve(mockExercise2)
            return Promise.resolve(null)
        })

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getAllByText('Upper Body A').length).toBeGreaterThan(0)
        })

        // Click on first day (Mon) to expand
        const monButtons = screen.getAllByText('Upper Body A')
        fireEvent.click(monButtons[0])

        // Should show exercise details
        await waitFor(() => {
            expect(screen.getByText('Bench Press')).toBeInTheDocument()
        })
    })

    it('navigates to create plan page when clicking new plan button', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetByPlan.mockResolvedValue([])

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('+ New Plan')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('+ New Plan'))
        expect(mockPush).toHaveBeenCalledWith('/plans/new')
    })

    it('navigates to create plan from empty state', async () => {
        mockGetByCreator.mockResolvedValue([])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('Create Your First Plan')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Create Your First Plan'))
        expect(mockPush).toHaveBeenCalledWith('/plans/new')
    })

    it('shows week selector buttons', async () => {
        mockGetByCreator.mockResolvedValue([mockPlan])
        mockGetActiveByUser.mockRejectedValue(new Error('No active'))
        mockGetByPlan.mockResolvedValue([])

        render(<PlansViewerPage />)

        await waitFor(() => {
            expect(screen.getByText('Week View')).toBeInTheDocument()
        })

        // Should show 12 week buttons
        for (let i = 1; i <= 12; i++) {
            expect(screen.getByText(String(i))).toBeInTheDocument()
        }
    })
})
