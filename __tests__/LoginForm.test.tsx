/* eslint-disable @typescript-eslint/no-require-imports, react/display-name, @typescript-eslint/no-unused-vars */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '@/components/LoginForm'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/supabaseDb'

// Mock framer-motion to avoid animation issues in tests
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
            // Only pass valid HTML attributes
            for (const [key, value] of Object.entries(rest)) {
                if (['className', 'style', 'onClick', 'onChange', 'onSubmit', 'disabled',
                    'type', 'placeholder', 'value', 'required', 'minLength', 'maxLength',
                    'pattern', 'title', 'id', 'name', 'role', 'aria-label',
                    'data-testid', 'href'].includes(key)) {
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
        Heading: createComponent('Heading', 'h2'),
        Flex: createComponent('Flex'),
    }
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Eye: () => null,
    EyeOff: () => null,
    Mail: () => null,
    Lock: () => null,
    User: () => null,
    CheckCircle: () => null,
}))

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signInWithOAuth: jest.fn(),
            resend: jest.fn(),
            signOut: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn().mockRejectedValue(new Error('no rows')),
                })),
            })),
        })),
    },
}))

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: {
            getByUsername: jest.fn(),
            getById: jest.fn(),
            getByEmail: jest.fn(),
            create: jest.fn(),
        },
    },
}))

jest.mock('@/lib/animations', () => ({
    fadeInUp: { hidden: {}, visible: {} },
    tapScale: {},
}))

describe('LoginForm', () => {
    const mockPush = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
        ;(db.profiles.getById as jest.Mock).mockResolvedValue(null)

        // Mock localStorage
        const localStorageMock: Record<string, string> = {}
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn((key: string) => localStorageMock[key] ?? null),
                setItem: jest.fn((key: string, value: string) => { localStorageMock[key] = value }),
                removeItem: jest.fn((key: string) => { delete localStorageMock[key] }),
                clear: jest.fn(),
            },
            writable: true,
        })
    })

    it('renders login form by default', () => {
        render(<LoginForm />)

        expect(screen.getByText('Welcome Back')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email or Username')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    })

    it('switches to signup form when clicking Sign Up', () => {
        render(<LoginForm />)

        fireEvent.click(screen.getByText('Sign Up'))

        expect(screen.getByText('Create Account')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument()
    })

    it('shows OAuth buttons for Google and Apple', () => {
        render(<LoginForm />)

        expect(screen.getByText('Continue with Google')).toBeInTheDocument()
        expect(screen.getByText('Continue with Apple')).toBeInTheDocument()
    })

    it('handles successful login with email', async () => {
        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({
            data: { user: { id: '123', email: 'test@example.com' } },
            error: null,
        })

        const mockGetProfile = db.profiles.getById as jest.Mock
        mockGetProfile.mockResolvedValue({ id: '123', email: 'test@example.com', username: 'testuser' })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1!' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'Password1!',
            })
            expect(mockPush).toHaveBeenCalledWith('/home')
        })
    })

    it('handles login with username lookup', async () => {
        const mockGetByUsername = db.profiles.getByUsername as jest.Mock
        mockGetByUsername.mockResolvedValue({ email: 'found@example.com' })

        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({
            data: { user: { id: '456', email: 'found@example.com' } },
            error: null,
        })

        const mockGetProfile = db.profiles.getById as jest.Mock
        mockGetProfile.mockResolvedValue({ id: '456', email: 'found@example.com', username: 'founduser' })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'founduser' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1!' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(mockGetByUsername).toHaveBeenCalledWith('founduser')
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'found@example.com',
                password: 'Password1!',
            })
            expect(mockPush).toHaveBeenCalledWith('/home')
        })
    })

    it('redirects new users to onboarding setup on login', async () => {
        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({
            data: {
                user: {
                    id: '789',
                    email: 'new@example.com',
                    user_metadata: { username: 'newuser' },
                },
            },
            error: null,
        })

        const mockGetProfile = db.profiles.getById as jest.Mock
        mockGetProfile.mockResolvedValue(null)

        const mockCreate = db.profiles.create as jest.Mock
        mockCreate.mockResolvedValue({ id: '789', email: 'new@example.com', username: 'newuser' })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'new@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1!' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/auth/setup'))
        })
    })

    it('shows error on failed login', async () => {
        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid login credentials' },
        })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(screen.getByText('Login failed: Invalid login credentials')).toBeInTheDocument()
        })
    })

    it('shows username not found error', async () => {
        const mockGetByUsername = db.profiles.getByUsername as jest.Mock
        mockGetByUsername.mockResolvedValue(null)

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'nonexistent' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1!' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(screen.getByText('Username not found')).toBeInTheDocument()
        })
    })

    it('validates password requirements on signup', async () => {
        render(<LoginForm />)

        // Switch to signup
        fireEvent.click(screen.getByText('Sign Up'))

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'short' } })

        // Submit
        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

        await waitFor(() => {
            expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument()
        })
    })

    it('validates password match on signup', async () => {
        render(<LoginForm />)

        fireEvent.click(screen.getByText('Sign Up'))

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'ValidPass1!' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'DifferentPass1!' } })

        fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

        await waitFor(() => {
            expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
        })
    })

    it('triggers Google OAuth when clicking Continue with Google', async () => {
        const mockOAuth = supabase.auth.signInWithOAuth as jest.Mock
        mockOAuth.mockResolvedValue({ data: {}, error: null })

        render(<LoginForm />)

        fireEvent.click(screen.getByText('Continue with Google'))

        await waitFor(() => {
            expect(mockOAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider: 'google',
                    options: expect.objectContaining({
                        redirectTo: expect.stringContaining('/auth/callback'),
                    }),
                })
            )
        })
    })

    it('triggers Apple OAuth when clicking Continue with Apple', async () => {
        const mockOAuth = supabase.auth.signInWithOAuth as jest.Mock
        mockOAuth.mockResolvedValue({ data: {}, error: null })

        render(<LoginForm />)

        fireEvent.click(screen.getByText('Continue with Apple'))

        await waitFor(() => {
            expect(mockOAuth).toHaveBeenCalledWith(
                expect.objectContaining({
                    provider: 'apple',
                    options: expect.objectContaining({
                        redirectTo: expect.stringContaining('/auth/callback'),
                    }),
                })
            )
        })
    })

    it('shows password strength indicators on signup', () => {
        render(<LoginForm />)

        fireEvent.click(screen.getByText('Sign Up'))

        expect(screen.getByText(/8\+ characters/)).toBeInTheDocument()
        expect(screen.getByText(/Uppercase/)).toBeInTheDocument()
        expect(screen.getByText(/Number\/Special/)).toBeInTheDocument()
    })

    it('clears errors when toggling between login and signup', async () => {
        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid credentials' },
        })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpass' } })
        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(screen.getByText('Login failed: Invalid credentials')).toBeInTheDocument()
        })

        // Toggle to signup - error should clear
        fireEvent.click(screen.getByText('Sign Up'))

        expect(screen.queryByText('Login failed: Invalid credentials')).not.toBeInTheDocument()
    })
})
