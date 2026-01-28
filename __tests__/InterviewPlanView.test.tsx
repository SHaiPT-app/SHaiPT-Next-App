import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        create: () => {
            const Component = (props: Record<string, unknown>) => {
                const { children, ...rest } = props;
                const htmlProps: Record<string, unknown> = {};
                for (const key of Object.keys(rest)) {
                    if (!['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap'].includes(key)) {
                        htmlProps[key] = rest[key];
                    }
                }
                return <div {...htmlProps}>{children as React.ReactNode}</div>;
            };
            return Component;
        },
        div: 'div',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
    ChevronDown: () => <span data-testid="icon-chevron-down" />,
    ChevronRight: () => <span data-testid="icon-chevron-right" />,
    Edit3: () => <span data-testid="icon-edit" />,
    Check: () => <span data-testid="icon-check" />,
    Plus: () => <span data-testid="icon-plus" />,
    X: () => <span data-testid="icon-x" />,
    Trash2: () => <span data-testid="icon-trash" />,
    Dumbbell: () => <span data-testid="icon-dumbbell" />,
    Target: () => <span data-testid="icon-target" />,
    Zap: () => <span data-testid="icon-zap" />,
    RotateCcw: () => <span data-testid="icon-rotate" />,
}));

import InterviewPlanView from '@/components/ai-coach/InterviewPlanView';
import type { GeneratedPlanData } from '@/app/api/ai-coach/generate-plan/route';

const mockPlan: GeneratedPlanData = {
    name: 'Upper/Lower Training Program',
    description: 'A balanced upper/lower split designed for muscle growth.',
    duration_weeks: 8,
    split_type: 'upper_lower',
    periodization_blocks: [
        { phase_type: 'hypertrophy', phase_duration_weeks: 4, label: 'Hypertrophy Phase' },
        { phase_type: 'strength', phase_duration_weeks: 3, label: 'Strength Phase' },
        { phase_type: 'deload', phase_duration_weeks: 1, label: 'Deload Week' },
    ],
    sessions: [
        {
            name: 'Upper Body A',
            day_number: 1,
            exercises: [
                {
                    exercise_name: 'Barbell Bench Press',
                    sets: [
                        { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
                        { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
                        { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
                    ],
                    notes: 'Control the descent, drive through the chest.',
                },
                {
                    exercise_name: 'Barbell Bent-Over Row',
                    sets: [
                        { reps: '8-12', weight: 'moderate', rest_seconds: 90 },
                        { reps: '8-12', weight: 'moderate', rest_seconds: 90 },
                    ],
                    notes: 'Hinge at hips, squeeze shoulder blades.',
                },
            ],
        },
        {
            name: 'Lower Body A',
            day_number: 2,
            exercises: [
                {
                    exercise_name: 'Barbell Back Squat',
                    sets: [
                        { reps: '6-8', weight: 'heavy', rest_seconds: 150 },
                        { reps: '6-8', weight: 'heavy', rest_seconds: 150 },
                        { reps: '6-8', weight: 'heavy', rest_seconds: 150 },
                    ],
                    notes: 'Full depth below parallel.',
                },
            ],
        },
    ],
};

function renderComponent(props: Partial<React.ComponentProps<typeof InterviewPlanView>> = {}) {
    const defaultProps = {
        plan: mockPlan,
        onPlanUpdate: jest.fn(),
        isSaving: false,
        saveStatus: 'idle' as const,
        ...props,
    };

    return render(
        <ChakraProvider value={system}>
            <InterviewPlanView {...defaultProps} />
        </ChakraProvider>
    );
}

describe('InterviewPlanView', () => {
    it('renders the plan name and description', () => {
        renderComponent();

        expect(screen.getByText('Upper/Lower Training Program')).toBeInTheDocument();
        expect(screen.getByText('A balanced upper/lower split designed for muscle growth.')).toBeInTheDocument();
    });

    it('renders plan metadata', () => {
        renderComponent();

        expect(screen.getByText('8 weeks')).toBeInTheDocument();
        expect(screen.getByText('2 days/week')).toBeInTheDocument();
    });

    it('renders periodization blocks', () => {
        renderComponent();

        expect(screen.getByText('Hypertrophy Phase')).toBeInTheDocument();
        expect(screen.getByText('Strength Phase')).toBeInTheDocument();
        expect(screen.getByText('Deload Week')).toBeInTheDocument();
    });

    it('renders session day cards', () => {
        renderComponent();

        expect(screen.getByText('Upper Body A')).toBeInTheDocument();
        expect(screen.getByText('Lower Body A')).toBeInTheDocument();
    });

    it('shows exercise count on session cards', () => {
        renderComponent();

        expect(screen.getByText('2 exercises')).toBeInTheDocument();
        expect(screen.getByText('1 exercises')).toBeInTheDocument();
    });

    it('expands session when clicked', () => {
        renderComponent();

        // Initially exercises should not be visible
        expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();

        // Click to expand
        fireEvent.click(screen.getByTestId('session-day-1'));

        // Now exercises should appear
        expect(screen.getByText('Barbell Bench Press')).toBeInTheDocument();
        expect(screen.getByText('Barbell Bent-Over Row')).toBeInTheDocument();
    });

    it('shows exercise notes when expanded', () => {
        renderComponent();

        fireEvent.click(screen.getByTestId('session-day-1'));

        expect(screen.getByText('Control the descent, drive through the chest.')).toBeInTheDocument();
    });

    it('shows save status indicators', () => {
        renderComponent({ saveStatus: 'saved' });
        expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('shows saving indicator', () => {
        renderComponent({ saveStatus: 'saving', isSaving: true });
        expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows error indicator', () => {
        renderComponent({ saveStatus: 'error' });
        expect(screen.getByText('Save failed')).toBeInTheDocument();
    });

    it('calls onPlanUpdate when exercise is edited', () => {
        const onPlanUpdate = jest.fn();
        renderComponent({ onPlanUpdate });

        // Expand day 1
        fireEvent.click(screen.getByTestId('session-day-1'));

        // Click edit on first exercise
        const editButtons = screen.getAllByTestId('edit-exercise-btn');
        fireEvent.click(editButtons[0]);

        // Should show edit inputs
        const nameInput = screen.getByTestId('exercise-name-input');
        fireEvent.change(nameInput, { target: { value: 'Incline Bench Press' } });

        expect(onPlanUpdate).toHaveBeenCalled();
        const updatedPlan = onPlanUpdate.mock.calls[0][0];
        expect(updatedPlan.sessions[0].exercises[0].exercise_name).toBe('Incline Bench Press');
    });

    it('shows add set button when editing', () => {
        renderComponent();

        fireEvent.click(screen.getByTestId('session-day-1'));

        const editButtons = screen.getAllByTestId('edit-exercise-btn');
        fireEvent.click(editButtons[0]);

        expect(screen.getAllByTestId('add-set-btn').length).toBeGreaterThan(0);
    });

    it('renders the edit hint text', () => {
        renderComponent();

        expect(
            screen.getByText(/Tap any day to expand/)
        ).toBeInTheDocument();
    });
});
