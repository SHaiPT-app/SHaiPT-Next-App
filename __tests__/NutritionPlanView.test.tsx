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
    ShoppingCart: () => <span data-testid="icon-shopping-cart" />,
    Lightbulb: () => <span data-testid="icon-lightbulb" />,
    UtensilsCrossed: () => <span data-testid="icon-utensils" />,
    Clock: () => <span data-testid="icon-clock" />,
    Edit3: () => <span data-testid="icon-edit" />,
    Check: () => <span data-testid="icon-check" />,
    X: () => <span data-testid="icon-x" />,
}));

import NutritionPlanView from '@/components/ai-coach/NutritionPlanView';
import type { GeneratedNutritionPlanData } from '@/app/api/ai-coach/generate-nutrition-plan/route';

const mockPlan: GeneratedNutritionPlanData = {
    name: 'Test Performance Plan',
    dietary_preferences: ['Mediterranean', 'High Protein'],
    plan_overview: {
        duration_days: 7,
        daily_calories: 2400,
        macros: {
            calories: 2400,
            protein_g: 180,
            carbs_g: 260,
            fat_g: 75,
        },
        key_principles: [
            'Eat protein at every meal',
            'Stay hydrated',
        ],
    },
    daily_schedule: {
        day_1: {
            breakfast: {
                name: 'Protein Oats',
                ingredients: ['oats', 'protein powder', 'banana'],
                instructions: 'Cook oats, mix in protein.',
                prep_time_minutes: 10,
                nutrition: { calories: 500, protein_g: 35, carbs_g: 60, fat_g: 12 },
            },
            lunch: {
                name: 'Chicken Bowl',
                ingredients: ['chicken breast', 'brown rice', 'broccoli'],
                instructions: 'Grill chicken, serve over rice.',
                prep_time_minutes: 25,
                nutrition: { calories: 600, protein_g: 50, carbs_g: 55, fat_g: 15 },
            },
            dinner: {
                name: 'Salmon Plate',
                ingredients: ['salmon', 'sweet potato', 'asparagus'],
                instructions: 'Bake salmon at 200C.',
                prep_time_minutes: 30,
                nutrition: { calories: 580, protein_g: 42, carbs_g: 48, fat_g: 20 },
            },
            snacks: [
                {
                    name: 'Greek Yogurt',
                    ingredients: ['yogurt', 'berries'],
                    instructions: 'Mix together.',
                    prep_time_minutes: 3,
                    nutrition: { calories: 200, protein_g: 20, carbs_g: 25, fat_g: 4 },
                },
            ],
        },
        day_2: {
            breakfast: {
                name: 'Egg Toast',
                ingredients: ['eggs', 'bread', 'avocado'],
                instructions: 'Scramble eggs, toast bread.',
                prep_time_minutes: 10,
                nutrition: { calories: 450, protein_g: 25, carbs_g: 35, fat_g: 22 },
            },
            lunch: {
                name: 'Turkey Wrap',
                ingredients: ['turkey', 'wrap', 'veggies'],
                instructions: 'Wrap everything together.',
                prep_time_minutes: 10,
                nutrition: { calories: 550, protein_g: 40, carbs_g: 45, fat_g: 18 },
            },
            dinner: {
                name: 'Steak Dinner',
                ingredients: ['steak', 'potatoes', 'salad'],
                instructions: 'Grill steak.',
                prep_time_minutes: 25,
                nutrition: { calories: 650, protein_g: 50, carbs_g: 40, fat_g: 30 },
            },
        },
    },
    shopping_list: {
        proteins: ['Chicken breast', 'Salmon', 'Turkey'],
        vegetables: ['Broccoli', 'Asparagus'],
    },
    nutrition_tips: [
        'Eat protein within 30 minutes of training.',
        'Stay hydrated throughout the day.',
    ],
};

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <ChakraProvider value={system}>
            {ui}
        </ChakraProvider>
    );
}

describe('NutritionPlanView', () => {
    const mockOnPlanUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the plan name', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        expect(screen.getByText('Test Performance Plan')).toBeInTheDocument();
    });

    it('displays calorie and macro overview', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        expect(screen.getByText('2400 cal/day')).toBeInTheDocument();
        expect(screen.getByText('P: 180g')).toBeInTheDocument();
        expect(screen.getByText('C: 260g')).toBeInTheDocument();
        expect(screen.getByText('F: 75g')).toBeInTheDocument();
    });

    it('displays dietary preference tags', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        expect(screen.getByText('Mediterranean')).toBeInTheDocument();
        expect(screen.getByText('High Protein')).toBeInTheDocument();
    });

    it('displays key principles', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        expect(screen.getByText('Eat protein at every meal')).toBeInTheDocument();
        expect(screen.getByText('Stay hydrated')).toBeInTheDocument();
    });

    it('renders day cards', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        expect(screen.getByText('Day 1')).toBeInTheDocument();
        expect(screen.getByText('Day 2')).toBeInTheDocument();
    });

    it('shows day 1 meals expanded by default', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        // Day 1 should be expanded, showing meal names
        expect(screen.getByText('Protein Oats')).toBeInTheDocument();
        expect(screen.getByText('Chicken Bowl')).toBeInTheDocument();
        expect(screen.getByText('Salmon Plate')).toBeInTheDocument();
        expect(screen.getByText('Greek Yogurt')).toBeInTheDocument();
    });

    it('toggles day expansion on click', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );

        // Day 2 should be collapsed
        expect(screen.queryByText('Egg Toast')).not.toBeInTheDocument();

        // Click Day 2 to expand it
        fireEvent.click(screen.getByTestId('day-toggle-day_2'));
        expect(screen.getByText('Egg Toast')).toBeInTheDocument();
    });

    it('shows meal nutrition info', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        // Should show breakfast macro info
        expect(screen.getByText('500 cal')).toBeInTheDocument();
    });

    it('toggles shopping list', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );

        // Shopping list should be collapsed by default
        expect(screen.queryByText('Chicken breast')).not.toBeInTheDocument();

        // Click to expand
        fireEvent.click(screen.getByTestId('toggle-shopping-list'));
        expect(screen.getByText('Chicken breast')).toBeInTheDocument();
        expect(screen.getByText('Salmon')).toBeInTheDocument();
    });

    it('toggles nutrition tips', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );

        // Tips should be collapsed by default
        expect(screen.queryByText('Eat protein within 30 minutes of training.')).not.toBeInTheDocument();

        // Click to expand
        fireEvent.click(screen.getByTestId('toggle-nutrition-tips'));
        expect(screen.getByText('Eat protein within 30 minutes of training.')).toBeInTheDocument();
    });

    it('shows "Saved to library" when saveStatus is saved', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="saved"
            />
        );
        expect(screen.getByText('Saved to library')).toBeInTheDocument();
    });

    it('shows "Saving..." when isSaving is true', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={true}
                saveStatus="saving"
            />
        );
        expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows edit button for meals', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );
        // Should have edit buttons for breakfast, lunch, dinner
        expect(screen.getByTestId('edit-meal-day_1-breakfast')).toBeInTheDocument();
        expect(screen.getByTestId('edit-meal-day_1-lunch')).toBeInTheDocument();
        expect(screen.getByTestId('edit-meal-day_1-dinner')).toBeInTheDocument();
    });

    it('enters edit mode when edit button is clicked', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );

        // Click edit on breakfast
        fireEvent.click(screen.getByTestId('edit-meal-day_1-breakfast'));

        // Should show edit fields
        expect(screen.getByTestId('edit-meal-name')).toBeInTheDocument();
        expect(screen.getByTestId('save-meal-edit')).toBeInTheDocument();
    });

    it('calls onPlanUpdate when edit is saved', () => {
        renderWithProviders(
            <NutritionPlanView
                plan={mockPlan}
                onPlanUpdate={mockOnPlanUpdate}
                isSaving={false}
                saveStatus="idle"
            />
        );

        // Click edit on breakfast
        fireEvent.click(screen.getByTestId('edit-meal-day_1-breakfast'));

        // Modify the meal name
        const nameInput = screen.getByTestId('edit-meal-name') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Updated Oats' } });

        // Save
        fireEvent.click(screen.getByTestId('save-meal-edit'));

        // Should call onPlanUpdate with modified plan
        expect(mockOnPlanUpdate).toHaveBeenCalledTimes(1);
        const updatedPlan = mockOnPlanUpdate.mock.calls[0][0];
        expect(updatedPlan.daily_schedule.day_1.breakfast.name).toBe('Updated Oats');
    });
});
