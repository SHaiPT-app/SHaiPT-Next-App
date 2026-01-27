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
        aiChats: {
            create: jest.fn().mockResolvedValue({}),
        },
        profiles: {
            update: jest.fn().mockResolvedValue({}),
        },
    },
}))

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

    it('shows continue button when onboarding is complete', async () => {
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

    it('navigates to /home when continue button is clicked', async () => {
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

        fireEvent.click(screen.getByTestId('continue-button'))
        expect(mockPush).toHaveBeenCalledWith('/home')
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
})
