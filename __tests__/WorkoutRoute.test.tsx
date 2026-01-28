import { render, screen, fireEvent } from '@testing-library/react';
import WorkoutPage from '@/app/(main)/home/workout/page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/WorkoutLogger', () => {
    return function MockWorkoutLogger({ userId }: { userId: string }) {
        return <div data-testid="workout-logger">WorkoutLogger for {userId}</div>;
    };
});

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
};

describe('Workout Route Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Storage.prototype.getItem = jest.fn((key: string) => {
            if (key === 'user') return JSON.stringify(mockUser);
            return null;
        });
    });

    it('renders WorkoutLogger component', () => {
        render(<WorkoutPage />);
        expect(screen.getByTestId('workout-logger')).toBeInTheDocument();
    });

    it('passes user ID to WorkoutLogger', () => {
        render(<WorkoutPage />);
        expect(screen.getByText('WorkoutLogger for user-123')).toBeInTheDocument();
    });

    it('has back button that navigates to dashboard', () => {
        render(<WorkoutPage />);
        const backButton = screen.getByText('Back to Dashboard');
        fireEvent.click(backButton);
        expect(mockPush).toHaveBeenCalledWith('/home');
    });
});
