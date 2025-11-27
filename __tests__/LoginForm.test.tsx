import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '@/components/LoginForm'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/supabaseDb'

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
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
    },
}))

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: {
            getByUsername: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
        },
    },
}))

describe('LoginForm', () => {
    const mockPush = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
            ; (useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    })

    it('renders login form by default', () => {
        render(<LoginForm />)

        expect(screen.getByText('Welcome Back')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email or Username')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    })

    it('switches to signup form', () => {
        render(<LoginForm />)

        fireEvent.click(screen.getByText('Sign Up'))

        expect(screen.getByText('Create Account')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
    })

    it('handles login submission', async () => {
        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock
        mockSignIn.mockResolvedValue({ data: { user: { id: '123' } }, error: null })

        const mockGetProfile = db.profiles.getById as jest.Mock
        mockGetProfile.mockResolvedValue({ id: '123', email: 'test@example.com' })

        render(<LoginForm />)

        fireEvent.change(screen.getByPlaceholderText('Email or Username'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })

        fireEvent.click(screen.getByRole('button', { name: 'Login' }))

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            })
            expect(mockPush).toHaveBeenCalledWith('/dashboard')
        })
    })
})
