/* eslint-disable @typescript-eslint/no-require-imports, react/display-name */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnboardingPage from '@/app/onboarding/page'
import { useRouter } from 'next/navigation'

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

// Mock framer-motion
jest.mock('framer-motion', () => {
    const React = require('react')
    return {
        motion: {
            create: (Component: React.ComponentType) => {
                return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
                    const {
                        variants, initial, animate, exit,
                        whileHover, whileTap, whileInView,
                        ...rest
                    } = props
                    return React.createElement(Component, { ...rest, ref })
                })
            },
            div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
                const {
                    variants, initial, animate, exit,
                    whileHover, whileTap, whileInView,
                    ...rest
                } = props
                return React.createElement('div', { ...rest, ref })
            }),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    }
})

// Mock Chakra UI
jest.mock('@chakra-ui/react', () => {
    const React = require('react')
    const createComponent = (displayName: string, element = 'div') => {
        const Component = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
            const { children, as, ...rest } = props
            const filteredProps: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(rest)) {
                if (['className', 'style', 'onClick', 'onChange', 'onSubmit', 'disabled',
                    'type', 'placeholder', 'value', 'required', 'id', 'name', 'role',
                    'aria-label', 'data-testid', 'href'].includes(key)) {
                    filteredProps[key] = value
                }
            }
            return React.createElement(
                (as as string) || element,
                { ...filteredProps, ref },
                children
            )
        })
        Component.displayName = displayName
        return Component
    }
    return {
        Box: createComponent('Box'),
        Text: createComponent('Text', 'span'),
        Input: createComponent('Input', 'input'),
        Button: createComponent('Button', 'button'),
        VStack: createComponent('VStack'),
        HStack: createComponent('HStack'),
        Heading: createComponent('Heading', 'h1'),
        Flex: createComponent('Flex'),
    }
})

// Mock lucide-react
jest.mock('lucide-react', () => ({
    Send: () => 'Send',
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

// Mock supabaseDb
jest.mock('@/lib/supabaseDb', () => ({
    db: {
        aiChats: { create: jest.fn().mockResolvedValue({}) },
        profiles: { update: jest.fn().mockResolvedValue({}) },
        trainingPlans: { create: jest.fn().mockResolvedValue({ id: 'plan-123' }) },
        workoutSessions: { create: jest.fn().mockResolvedValue({ id: 'session-123' }) },
        trainingPlanSessions: { createBulk: jest.fn().mockResolvedValue([]) },
        trainingPlanAssignments: { create: jest.fn().mockResolvedValue({}) },
    },
}))

// Import the mocked db for assertions
import { db as mockDb } from '@/lib/supabaseDb'

jest.mock('@/lib/animations', () => ({
    fadeInUp: { hidden: {}, visible: {} },
    staggerContainer: { hidden: {}, visible: {} },
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('OnboardingPage', () => {
    const mockPush = jest.fn()
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
        mockFetch.mockReset()

        // Default: mock the initial interview start call
        mockFetch.mockResolvedValue({
            json: () => Promise.resolve({
                message: "Welcome! What are your fitness goals?",
                isComplete: false,
            }),
        })

        // Mock localStorage
        const store: Record<string, string> = {
            user: JSON.stringify(mockUser),
        }
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn((key: string) => store[key] ?? null),
                setItem: jest.fn((key: string, value: string) => { store[key] = value }),
                removeItem: jest.fn((key: string) => { delete store[key] }),
                clear: jest.fn(),
            },
            writable: true,
        })
    })

    it('redirects to login if no user in localStorage', () => {
        ;(window.localStorage.getItem as jest.Mock).mockReturnValue(null)

        render(<OnboardingPage />)

        expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('renders the onboarding header', async () => {
        render(<OnboardingPage />)

        expect(screen.getByText('AI Onboarding')).toBeInTheDocument()
        expect(screen.getByText('Let your AI Coach get to know you')).toBeInTheDocument()
    })

    it('starts the interview on mount and shows AI greeting', async () => {
        render(<OnboardingPage />)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/onboarding', expect.objectContaining({
                method: 'POST',
            }))
        })

        await waitFor(() => {
            expect(screen.getByText('Welcome! What are your fitness goals?')).toBeInTheDocument()
        })
    })

    it('renders the chat input and send button', async () => {
        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByTestId('chat-input')).toBeInTheDocument()
            expect(screen.getByTestId('send-button')).toBeInTheDocument()
        })
    })

    it('sends user message and displays AI response', async () => {
        // First call: interview start. Second call: user response.
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "Welcome! What are your fitness goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "Building muscle is a great goal! What is your experience level?",
                    isComplete: false,
                }),
            })

        render(<OnboardingPage />)

        // Wait for initial greeting
        await waitFor(() => {
            expect(screen.getByText('Welcome! What are your fitness goals?')).toBeInTheDocument()
        })

        // Type and send message
        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Build muscle' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByText('Build muscle')).toBeInTheDocument()
        })

        await waitFor(() => {
            expect(screen.getByText('Building muscle is a great goal! What is your experience level?')).toBeInTheDocument()
        })
    })

    it('shows continue button when onboarding is complete and plans are generated', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your fitness goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "Great! You're all set. Here's your summary.",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    data: {
                        extracted_profile: { fitness_goals: ['general_health'] },
                        training_plan: { name: 'Plan', description: '', duration_weeks: 4, sessions: [] },
                        nutrition_plan: { daily_calories: 2000, macros: {}, meal_plan: [], shopping_list: [], notes: '' },
                    },
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your fitness goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'No restrictions' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByTestId('continue-button')).toBeInTheDocument()
            expect(screen.getByText('Continue to Dashboard')).toBeInTheDocument()
        })
    })

    it('navigates to /dashboard when continue button is clicked', async () => {
        // Mock: interview start, user response (complete), plan generation
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    data: {
                        extracted_profile: { fitness_goals: ['build_muscle'] },
                        training_plan: {
                            name: 'Test Plan',
                            description: 'A test plan',
                            duration_weeks: 4,
                            sessions: [],
                        },
                        nutrition_plan: {
                            daily_calories: 2000,
                            macros: { protein_g: 150, carbs_g: 200, fat_g: 67 },
                            meal_plan: [],
                            shopping_list: [],
                            notes: 'Test',
                        },
                    },
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        // Wait for plan generation to complete and continue button to appear
        await waitFor(() => {
            expect(screen.getByTestId('continue-button')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByTestId('continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('does not send empty messages', async () => {
        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByTestId('chat-input')).toBeInTheDocument()
        })

        // Try to submit empty
        const input = screen.getByTestId('chat-input')
        fireEvent.submit(input.closest('form')!)

        // Only the initial interview start call should have been made
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('handles API errors gracefully', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    error: 'Server error',
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Test' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByText('Sorry, something went wrong. Please try again.')).toBeInTheDocument()
        })
    })

    it('shows role labels for messages', async () => {
        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('AI Coach')).toBeInTheDocument()
        })
    })

    it('shows generating plans indicator when onboarding completes', async () => {
        // Mock: interview start, user response (complete), plan generation (slow)
        let resolvePlanGeneration: (value: unknown) => void
        const planGenerationPromise = new Promise((resolve) => {
            resolvePlanGeneration = resolve
        })

        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockImplementationOnce(() => planGenerationPromise)

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByTestId('generating-plans')).toBeInTheDocument()
            expect(screen.getByText('Generating your personalized plans...')).toBeInTheDocument()
        })

        // Resolve plan generation
        resolvePlanGeneration!({
            json: () => Promise.resolve({
                success: true,
                data: {
                    extracted_profile: { fitness_goals: ['build_muscle'] },
                    training_plan: { name: 'Plan', description: '', duration_weeks: 4, sessions: [] },
                    nutrition_plan: { daily_calories: 2000, macros: {}, meal_plan: [], shopping_list: [], notes: '' },
                },
            }),
        })

        await waitFor(() => {
            expect(screen.getByTestId('continue-button')).toBeInTheDocument()
        })
    })

    it('shows error state with retry and skip when plan generation fails', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    error: 'AI generation failed',
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByTestId('generation-error')).toBeInTheDocument()
            expect(screen.getByTestId('retry-button')).toBeInTheDocument()
            expect(screen.getByTestId('skip-button')).toBeInTheDocument()
        })
    })

    it('allows skipping to dashboard when plan generation fails', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    error: 'AI generation failed',
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByTestId('skip-button')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByTestId('skip-button'))
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('calls generate-plans API when onboarding completes', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    data: {
                        extracted_profile: { fitness_goals: ['build_muscle'] },
                        training_plan: { name: 'Plan', description: '', duration_weeks: 4, sessions: [] },
                        nutrition_plan: { daily_calories: 2000, macros: {}, meal_plan: [], shopping_list: [], notes: '' },
                    },
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            // Should have called: 1) interview start, 2) user response, 3) generate-plans
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/onboarding/generate-plans',
                expect.objectContaining({ method: 'POST' })
            )
        })
    })

    it('saves training plan and nutrition plan to Supabase', async () => {
        mockFetch
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "What are your goals?",
                    isComplete: false,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    message: "All done!",
                    isComplete: true,
                }),
            })
            .mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    data: {
                        extracted_profile: { fitness_goals: ['build_muscle'] },
                        training_plan: {
                            name: 'Test Plan',
                            description: 'Test description',
                            duration_weeks: 4,
                            sessions: [
                                {
                                    name: 'Day 1',
                                    description: 'Push',
                                    day_number: 1,
                                    week_number: 1,
                                    exercises: [{
                                        exercise_name: 'Bench Press',
                                        sets: [{ reps: '10', weight: 'moderate', rest_seconds: 90 }],
                                        notes: 'Go slow',
                                    }],
                                },
                            ],
                        },
                        nutrition_plan: {
                            daily_calories: 2500,
                            macros: { protein_g: 180, carbs_g: 280, fat_g: 78 },
                            meal_plan: [],
                            shopping_list: [],
                            notes: 'Eat well',
                        },
                    },
                }),
            })

        render(<OnboardingPage />)

        await waitFor(() => {
            expect(screen.getByText('What are your goals?')).toBeInTheDocument()
        })

        const input = screen.getByTestId('chat-input')
        fireEvent.change(input, { target: { value: 'Done' } })
        fireEvent.submit(input.closest('form')!)

        await waitFor(() => {
            expect(screen.getByTestId('continue-button')).toBeInTheDocument()
        })

        // Verify training plan was created
        expect((mockDb as any).trainingPlans.create).toHaveBeenCalledWith(
            expect.objectContaining({
                creator_id: 'user-123',
                name: 'Test Plan',
                description: 'Test description',
                duration_weeks: 4,
            })
        )

        // Verify workout session was created
        expect((mockDb as any).workoutSessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
                creator_id: 'user-123',
                name: 'Day 1',
            })
        )

        // Verify plan-session links were created
        expect((mockDb as any).trainingPlanSessions.createBulk).toHaveBeenCalled()

        // Verify plan assignment was created
        expect((mockDb as any).trainingPlanAssignments.create).toHaveBeenCalledWith(
            expect.objectContaining({
                plan_id: 'plan-123',
                user_id: 'user-123',
                is_self_assigned: true,
                is_active: true,
            })
        )

        // Verify nutrition plan was saved as AI chat
        expect((mockDb as any).aiChats.create).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-123',
                title: 'My Nutrition Plan',
            })
        )
    })
})
