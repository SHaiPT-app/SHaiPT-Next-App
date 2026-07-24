import { render, screen, waitFor } from '@testing-library/react';
import TrainerDashboardPage from '@/app/(main)/trainer/page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: { session: { access_token: 'test-token' } },
            }),
        },
    },
}));

// Mock supabaseDb
jest.mock('@/lib/supabaseDb', () => ({
    db: {
        coachingRelationships: {
            getPendingAsCoach: jest.fn().mockResolvedValue([]),
        },
        profiles: {
            getById: jest.fn().mockResolvedValue(null),
        },
    },
}));

// Mock localStorage
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TrainerDashboardPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    it('redirects to home when no user in localStorage', async () => {
        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('redirects to dashboard when user is not a trainer', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'user-1',
            email: 'trainee@test.com',
            username: 'trainee',
            role: 'trainee',
        }));

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('renders client roster heading when user is a trainer', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'trainer-1',
            email: 'trainer@test.com',
            username: 'trainer',
            role: 'trainer',
        }));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                clients: [
                    {
                        id: 'athlete-1',
                        email: 'athlete@test.com',
                        username: 'athlete1',
                        full_name: 'Test Athlete',
                        avatar_url: null,
                        lastWorkoutDate: '2025-01-20',
                        currentPlan: 'Strength Program',
                        streak: 5,
                        relationshipId: 'rel-1',
                        canAssignPlans: true,
                        canViewWorkouts: true,
                    },
                ],
            }),
        });

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('Client Roster')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('Test Athlete')).toBeInTheDocument();
            expect(screen.getByText('@athlete1')).toBeInTheDocument();
            expect(screen.getByText('Strength Program')).toBeInTheDocument();
            expect(screen.getByText('5d')).toBeInTheDocument();
        });
    });

    it('shows empty state when trainer has no clients', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'trainer-1',
            email: 'trainer@test.com',
            username: 'trainer',
            role: 'trainer',
        }));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ clients: [] }),
        });

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('No active clients found.')).toBeInTheDocument();
        });
    });

    it('shows error message when API call fails', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'trainer-1',
            email: 'trainer@test.com',
            username: 'trainer',
            role: 'trainer',
        }));

        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Server error' }),
        });

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('Server error')).toBeInTheDocument();
        });
    });

    it('renders correct client count in subheading', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'trainer-1',
            email: 'trainer@test.com',
            username: 'trainer',
            role: 'trainer',
        }));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                clients: [
                    {
                        id: 'a1', email: 'a@t.com', username: 'a', full_name: 'A',
                        lastWorkoutDate: null, currentPlan: null, streak: 0,
                        relationshipId: 'r1', canAssignPlans: true, canViewWorkouts: true,
                    },
                    {
                        id: 'a2', email: 'b@t.com', username: 'b', full_name: 'B',
                        lastWorkoutDate: null, currentPlan: null, streak: 0,
                        relationshipId: 'r2', canAssignPlans: true, canViewWorkouts: true,
                    },
                ],
            }),
        });

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('2 active clients')).toBeInTheDocument();
        });
    });

    it('displays dash for zero streak', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'trainer-1',
            email: 'trainer@test.com',
            username: 'trainer',
            role: 'trainer',
        }));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                clients: [
                    {
                        id: 'a1', email: 'a@t.com', username: 'a', full_name: 'Lazy User',
                        lastWorkoutDate: null, currentPlan: null, streak: 0,
                        relationshipId: 'r1', canAssignPlans: true, canViewWorkouts: true,
                    },
                ],
            }),
        });

        render(<TrainerDashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('-')).toBeInTheDocument();
        });
    });
});
