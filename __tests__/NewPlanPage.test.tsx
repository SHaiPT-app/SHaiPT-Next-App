import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue(null)
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
    }),
    useSearchParams: () => ({
        get: mockGet,
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
const mockCreatePlan = jest.fn()
const mockUpdatePlan = jest.fn()
const mockGetPlanById = jest.fn()
const mockGetByPlan = jest.fn()
const mockCreateWorkoutSession = jest.fn()
const mockCreatePlanSession = jest.fn()
const mockDeleteByPlan = jest.fn()

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        trainingPlans: {
            create: (...args: unknown[]) => mockCreatePlan(...args),
            update: (...args: unknown[]) => mockUpdatePlan(...args),
            getById: (...args: unknown[]) => mockGetPlanById(...args),
        },
        trainingPlanSessions: {
            getByPlan: (...args: unknown[]) => mockGetByPlan(...args),
            create: (...args: unknown[]) => mockCreatePlanSession(...args),
            deleteByPlan: (...args: unknown[]) => mockDeleteByPlan(...args),
        },
        workoutSessions: {
            create: (...args: unknown[]) => mockCreateWorkoutSession(...args),
            getById: jest.fn().mockResolvedValue(null),
        },
        exercises: {
            search: jest.fn().mockResolvedValue([]),
            getById: jest.fn().mockResolvedValue(null),
        },
    },
}))

// Mock ExerciseSearch component
jest.mock('@/components/ExerciseSearch', () => {
    return function MockExerciseSearch() {
        return <div data-testid="exercise-search">Exercise Search</div>
    }
})

import NewPlanPage from '@/app/(main)/plans/new/page'

describe('NewPlanPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGet.mockReturnValue(null)

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

    it('renders the plan creation form with plan name input', () => {
        render(<NewPlanPage />)

        expect(screen.getByText('Plan Name')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('e.g., 12 Week Strength & Hypertrophy')).toBeInTheDocument()
    })

    it('shows manual and AI creation mode toggles', () => {
        render(<NewPlanPage />)

        expect(screen.getByText('Manual')).toBeInTheDocument()
        expect(screen.getByText('AI Generate')).toBeInTheDocument()
    })

    it('shows periodization blocks section with defaults', () => {
        render(<NewPlanPage />)

        expect(screen.getByText('Periodization Blocks')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Hypertrophy Phase')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Strength Phase')).toBeInTheDocument()
    })

    it('allows adding a new periodization block', () => {
        render(<NewPlanPage />)

        const addBlockButton = screen.getByText('Add Block')
        fireEvent.click(addBlockButton)

        // After adding, there should be more block entries
        const blockLabels = screen.getAllByPlaceholderText('Block label')
        expect(blockLabels.length).toBeGreaterThanOrEqual(4)
    })

    it('allows updating plan name', () => {
        render(<NewPlanPage />)

        const nameInput = screen.getByPlaceholderText('e.g., 12 Week Strength & Hypertrophy') as HTMLInputElement
        fireEvent.change(nameInput, { target: { value: 'My Test Plan' } })
        expect(nameInput.value).toBe('My Test Plan')
    })

    it('shows AI generation form when AI mode is selected', () => {
        render(<NewPlanPage />)

        fireEvent.click(screen.getByText('AI Generate'))

        expect(screen.getByText('AI Plan Generator')).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Build muscle/)).toBeInTheDocument()
    })

    it('shows add training day button', () => {
        render(<NewPlanPage />)

        expect(screen.getByText('Add Training Day')).toBeInTheDocument()
    })

    it('saves plan with periodization blocks when submitted', async () => {
        mockCreatePlan.mockResolvedValue({ id: 'new-plan-1' })
        mockCreateWorkoutSession.mockResolvedValue({ id: 'new-session-1' })
        mockCreatePlanSession.mockResolvedValue({ id: 'ps-1' })

        render(<NewPlanPage />)

        // Fill in plan name
        const nameInput = screen.getByPlaceholderText('e.g., 12 Week Strength & Hypertrophy')
        fireEvent.change(nameInput, { target: { value: 'Test Strength Plan' } })

        // Add a session so save button is enabled
        fireEvent.click(screen.getByText('Add Training Day'))

        // Click save (button text is "Create Plan")
        const saveButton = screen.getByText('Create Plan')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockCreatePlan).toHaveBeenCalled()
        })

        // Verify plan was created with periodization_blocks
        const createArgs = mockCreatePlan.mock.calls[0][0]
        expect(createArgs.periodization_blocks).toBeDefined()
        expect(createArgs.periodization_blocks.length).toBeGreaterThanOrEqual(1)
    })

    it('loads existing plan data when in edit mode', async () => {
        mockGet.mockReturnValue('plan-edit-1')
        mockGetPlanById.mockResolvedValue({
            id: 'plan-edit-1',
            creator_id: 'user-1',
            name: 'Existing Plan',
            description: 'An existing plan',
            duration_weeks: 12,
            periodization_blocks: [
                { phase_type: 'hypertrophy', phase_duration_weeks: 6, label: 'Hypertrophy Phase' },
                { phase_type: 'strength', phase_duration_weeks: 4, label: 'Strength Phase' },
                { phase_type: 'deload', phase_duration_weeks: 2, label: 'Deload' },
            ],
            is_template: true,
            is_public: false,
            is_shareable: false,
        })
        mockGetByPlan.mockResolvedValue([])

        render(<NewPlanPage />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('Existing Plan')).toBeInTheDocument()
        })

        expect(screen.getByDisplayValue('An existing plan')).toBeInTheDocument()
    })

    it('shows plan details section with description textarea', () => {
        render(<NewPlanPage />)

        expect(screen.getByText('Plan Details')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
    })
})
