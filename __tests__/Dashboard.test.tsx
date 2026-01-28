import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '@/app/(main)/home/page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

// Mock supabaseDb
const mockGetByCreator = jest.fn().mockResolvedValue([]);
const mockGetByUser = jest.fn().mockResolvedValue([]);
const mockDeletePlan = jest.fn().mockResolvedValue(undefined);
const mockDeleteNutritionPlan = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        trainingPlans: {
            getByCreator: (...args: unknown[]) => mockGetByCreator(...args),
            delete: (...args: unknown[]) => mockDeletePlan(...args),
        },
        nutritionPlans: {
            getByUser: (...args: unknown[]) => mockGetByUser(...args),
            delete: (...args: unknown[]) => mockDeleteNutritionPlan(...args),
        },
    },
}));

// Mock ConfirmationModal
jest.mock('@/components/ConfirmationModal', () => {
    return function MockConfirmationModal({ isOpen, onConfirm, onCancel, title }: {
        isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string;
    }) {
        if (!isOpen) return null;
        return (
            <div data-testid="confirmation-modal">
                <span>{title}</span>
                <button data-testid="confirm-delete" onClick={onConfirm}>Confirm</button>
                <button data-testid="cancel-delete" onClick={onCancel}>Cancel</button>
            </div>
        );
    };
});

// Mock EmptyState
jest.mock('@/components/EmptyState', () => {
    return function MockEmptyState({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
        return (
            <div data-testid="empty-state">
                <span>{title}</span>
                {action && <button onClick={action.onClick}>{action.label}</button>}
            </div>
        );
    };
});

// Mock ErrorState
jest.mock('@/components/ErrorState', () => {
    return function MockErrorState() { return <div data-testid="error-state" />; };
});

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
};

const mockWorkoutPlans = [
    {
        id: 'plan-1',
        creator_id: 'user-123',
        name: 'Hypertrophy Program',
        duration_weeks: 8,
        phase_type: 'hypertrophy',
    },
    {
        id: 'plan-2',
        creator_id: 'user-123',
        name: 'Strength Block',
        duration_weeks: 4,
        phase_type: 'strength',
    },
];

const mockNutritionPlans = [
    {
        id: 'nutrition-1',
        user_id: 'user-123',
        name: 'Bulking Diet',
        dietary_preferences: ['high-protein'],
        plan_overview: { duration_days: 30, daily_calories: 2800, macros: { calories: 2800, protein_g: 180, carbs_g: 300, fat_g: 80 } },
        daily_schedule: {},
    },
];

describe('Dashboard Home Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Storage.prototype.getItem = jest.fn((key: string) => {
            if (key === 'user') return JSON.stringify(mockUser);
            return null;
        });
    });

    describe('Primary Actions', () => {
        it('renders Start Workout and AI Coach cards', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('start-workout-card')).toBeInTheDocument();
                expect(screen.getByTestId('ai-coach-card')).toBeInTheDocument();
            });
        });

        it('navigates to workout page when Start Workout is clicked', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('start-workout-card')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('start-workout-card'));
            expect(mockPush).toHaveBeenCalledWith('/home/workout');
        });

        it('navigates to AI Coach when AI Coach card is clicked', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('ai-coach-card')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('ai-coach-card'));
            expect(mockPush).toHaveBeenCalledWith('/coach');
        });

        it('shows Recommended badge on AI Coach card when user has no plans', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('recommended-badge')).toBeInTheDocument();
            });
        });

        it('hides Recommended badge when user has plans', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.queryByTestId('recommended-badge')).not.toBeInTheDocument();
            });
        });

        it('shows plan count on Start Workout card when user has plans', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByText('2 saved plans available')).toBeInTheDocument();
            });
        });
    });

    describe('My Library Section', () => {
        it('renders My Library section', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('my-library')).toBeInTheDocument();
                expect(screen.getByText('My Library')).toBeInTheDocument();
            });
        });

        it('shows workout plans and nutrition plan tabs', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('library-tab-workout')).toBeInTheDocument();
                expect(screen.getByTestId('library-tab-nutrition')).toBeInTheDocument();
            });
        });

        it('shows empty state for workout plans when there are none', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByText('No workout plans yet')).toBeInTheDocument();
            });
        });

        it('renders workout plans in the library', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByText('Hypertrophy Program')).toBeInTheDocument();
                expect(screen.getByText('Strength Block')).toBeInTheDocument();
            });
        });

        it('switches to nutrition plans tab', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue(mockNutritionPlans);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('library-tab-nutrition')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('library-tab-nutrition'));

            await waitFor(() => {
                expect(screen.getByText('Bulking Diet')).toBeInTheDocument();
            });
        });

        it('shows edit and delete buttons on workout plans', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                const editButtons = screen.getAllByTestId('edit-workout-plan');
                const deleteButtons = screen.getAllByTestId('delete-workout-plan');
                expect(editButtons).toHaveLength(2);
                expect(deleteButtons).toHaveLength(2);
            });
        });

        it('navigates to edit page when edit button is clicked', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                const editButtons = screen.getAllByTestId('edit-workout-plan');
                fireEvent.click(editButtons[0]);
            });

            expect(mockPush).toHaveBeenCalledWith('/plans/new?edit=plan-1');
        });

        it('opens delete confirmation modal for workout plan', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                const deleteButtons = screen.getAllByTestId('delete-workout-plan');
                fireEvent.click(deleteButtons[0]);
            });

            expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        });

        it('deletes workout plan when confirmed', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                const deleteButtons = screen.getAllByTestId('delete-workout-plan');
                fireEvent.click(deleteButtons[0]);
            });

            fireEvent.click(screen.getByTestId('confirm-delete'));

            await waitFor(() => {
                expect(mockDeletePlan).toHaveBeenCalledWith('plan-1');
            });
        });

        it('opens delete confirmation for nutrition plan', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue(mockNutritionPlans);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByTestId('library-tab-nutrition')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('library-tab-nutrition'));

            await waitFor(() => {
                const deleteButton = screen.getByTestId('delete-nutrition-plan');
                fireEvent.click(deleteButton);
            });

            expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        });

        it('shows total item count', async () => {
            mockGetByCreator.mockResolvedValue(mockWorkoutPlans);
            mockGetByUser.mockResolvedValue(mockNutritionPlans);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByText('3 items')).toBeInTheDocument();
            });
        });
    });

    describe('User context', () => {
        it('displays user name in welcome message', async () => {
            mockGetByCreator.mockResolvedValue([]);
            mockGetByUser.mockResolvedValue([]);

            render(<HomePage />);

            await waitFor(() => {
                expect(screen.getByText(/Welcome back, Test User!/)).toBeInTheDocument();
            });
        });

        it('shows loading state initially', () => {
            // Temporarily return null for user
            Storage.prototype.getItem = jest.fn(() => null);

            render(<HomePage />);

            // After loading completes, should show Athlete as fallback
            expect(screen.getByText(/Welcome back, Athlete!/)).toBeInTheDocument();
        });
    });
});
