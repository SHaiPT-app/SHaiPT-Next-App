import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ClientProgressPage from '@/app/trainer/client/[id]/progress/page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
    useParams: () => ({
        id: 'client-1',
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

// Mock date-fns to avoid timezone issues
jest.mock('date-fns', () => ({
    format: jest.fn((date: Date | string, fmt: string) => {
        if (fmt === 'EEEE, MMMM do, yyyy') return 'Monday, January 20th, 2026';
        if (fmt === 'MMM d, yyyy') return 'Jan 20, 2026';
        return String(date);
    }),
    parseISO: jest.fn((str: string) => new Date(str)),
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

const trainerUser = {
    id: 'trainer-1',
    email: 'trainer@test.com',
    username: 'trainer',
    role: 'trainer',
};

const clientProgressData = {
    client: {
        id: 'client-1',
        email: 'client@test.com',
        username: 'clientuser',
        full_name: 'Test Client',
        avatar_url: null,
    },
    workoutLogs: [
        {
            id: 'log-1',
            user_id: 'client-1',
            date: '2026-01-20',
            total_duration_seconds: 3600,
            notes: 'Good session',
            exercise_logs: [
                {
                    id: 'el-1',
                    workout_log_id: 'log-1',
                    exercise_id: 'bench_press',
                    exercise_order: 1,
                    sets: [{ set_number: 1, reps: 10, weight: 135, weight_unit: 'lbs' }],
                    total_sets: 3,
                    max_weight: 135,
                },
            ],
        },
    ],
    bodyMeasurements: [
        { id: 'bm-1', user_id: 'client-1', date: '2026-01-20', weight_kg: 80 },
    ],
    progressMedia: [
        {
            id: 'pm-1',
            user_id: 'client-1',
            media_type: 'image',
            storage_path: 'client-1/photo.jpg',
            caption: 'Front pose',
            taken_at: '2026-01-20T00:00:00Z',
            visibility: 'public',
            url: 'https://storage.example.com/signed-url',
        },
    ],
    permissions: {
        can_view_workouts: true,
        can_assign_plans: true,
    },
};

describe('ClientProgressPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    it('redirects to home when no user in localStorage', async () => {
        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('redirects to dashboard when user is not a trainer', async () => {
        mockLocalStorage.setItem('user', JSON.stringify({
            id: 'user-1',
            email: 'trainee@test.com',
            role: 'trainee',
        }));

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('renders client name and workout logs tab by default', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => clientProgressData,
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('Test Client')).toBeInTheDocument();
        });

        expect(screen.getByText('@clientuser')).toBeInTheDocument();
        expect(screen.getByTestId('tab-workouts')).toBeInTheDocument();
        expect(screen.getByTestId('tab-analytics')).toBeInTheDocument();
        expect(screen.getByTestId('tab-photos')).toBeInTheDocument();

        // Default tab shows workout logs
        expect(screen.getByTestId('workout-log-card')).toBeInTheDocument();
        expect(screen.getByText('Good session')).toBeInTheDocument();
    });

    it('shows permission denied when can_view_workouts is false', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...clientProgressData,
                permissions: { can_view_workouts: false, can_assign_plans: true },
            }),
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText(/do not have permission/)).toBeInTheDocument();
        });
    });

    it('switches to analytics tab and shows stats', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => clientProgressData,
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('Test Client')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('tab-analytics'));

        await waitFor(() => {
            expect(screen.getByTestId('stat-total-workouts')).toBeInTheDocument();
        });

        expect(screen.getByText('Workouts')).toBeInTheDocument();
    });

    it('switches to progress photos tab and shows photos', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => clientProgressData,
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('Test Client')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('tab-photos'));

        await waitFor(() => {
            expect(screen.getByTestId('progress-photo-card')).toBeInTheDocument();
        });

        expect(screen.getByText('Front pose')).toBeInTheDocument();
    });

    it('shows error message when API fails', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'No active coaching relationship found' }),
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('No active coaching relationship found')).toBeInTheDocument();
        });
    });

    it('has a back button that navigates to trainer dashboard', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => clientProgressData,
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByTestId('back-button')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('back-button'));

        expect(mockPush).toHaveBeenCalledWith('/trainer');
    });

    it('shows empty state for workout logs tab', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...clientProgressData,
                workoutLogs: [],
            }),
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('No workout logs recorded yet.')).toBeInTheDocument();
        });
    });

    it('shows empty state for progress photos tab', async () => {
        mockLocalStorage.setItem('user', JSON.stringify(trainerUser));
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...clientProgressData,
                progressMedia: [],
            }),
        });

        render(<ClientProgressPage />);

        await waitFor(() => {
            expect(screen.getByText('Test Client')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('tab-photos'));

        await waitFor(() => {
            expect(screen.getByText('No progress photos available.')).toBeInTheDocument();
        });
    });
});
