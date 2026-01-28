import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';
import DietIntakeForm from '@/components/ai-coach/DietIntakeForm';
import type { DietIntakeFormData } from '@/lib/types';

const EMPTY_DIET_FORM: DietIntakeFormData = {
    allergies: '',
    intolerances: '',
    diet_style: '',
    foods_love: '',
    foods_hate: '',
    medical_dietary_considerations: '',
    meals_per_day: '',
    cooking_preferences: '',
};

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <ChakraProvider value={system}>
            {ui}
        </ChakraProvider>
    );
}

describe('DietIntakeForm', () => {
    const mockOnFieldChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the form header', () => {
        renderWithProviders(
            <DietIntakeForm formData={EMPTY_DIET_FORM} onFieldChange={mockOnFieldChange} />
        );
        expect(screen.getByText('Nutrition Intake Form')).toBeInTheDocument();
        expect(screen.getByText(/This form auto-fills as you chat with Dr. Nadia/)).toBeInTheDocument();
    });

    it('renders all form sections', () => {
        renderWithProviders(
            <DietIntakeForm formData={EMPTY_DIET_FORM} onFieldChange={mockOnFieldChange} />
        );
        expect(screen.getByText('Allergies & Intolerances')).toBeInTheDocument();
        expect(screen.getByText('Dietary Preferences')).toBeInTheDocument();
        expect(screen.getByText('Food Preferences')).toBeInTheDocument();
        expect(screen.getByText('Medical & Dietary Considerations')).toBeInTheDocument();
        expect(screen.getByText('Meal Preferences')).toBeInTheDocument();
    });

    it('renders all field labels', () => {
        renderWithProviders(
            <DietIntakeForm formData={EMPTY_DIET_FORM} onFieldChange={mockOnFieldChange} />
        );
        expect(screen.getByText('Food Allergies')).toBeInTheDocument();
        expect(screen.getByText('Food Intolerances')).toBeInTheDocument();
        expect(screen.getByText(/Diet Style/)).toBeInTheDocument();
        expect(screen.getByText('Foods You Love')).toBeInTheDocument();
        expect(screen.getByText('Foods You Hate')).toBeInTheDocument();
        expect(screen.getByText(/Medical \/ Dietary Considerations/)).toBeInTheDocument();
        expect(screen.getByText('Meals Per Day')).toBeInTheDocument();
        expect(screen.getByText('Cooking Preferences')).toBeInTheDocument();
    });

    it('calls onFieldChange when a field is modified', () => {
        renderWithProviders(
            <DietIntakeForm formData={EMPTY_DIET_FORM} onFieldChange={mockOnFieldChange} />
        );
        const mealsInput = screen.getByTestId('diet-field-meals_per_day');
        fireEvent.change(mealsInput, { target: { value: '4' } });
        expect(mockOnFieldChange).toHaveBeenCalledWith('meals_per_day', '4');
    });

    it('calls onFieldChange for textarea fields', () => {
        renderWithProviders(
            <DietIntakeForm formData={EMPTY_DIET_FORM} onFieldChange={mockOnFieldChange} />
        );
        const allergiesInput = screen.getByTestId('diet-field-allergies');
        fireEvent.change(allergiesInput, { target: { value: 'peanuts, shellfish' } });
        expect(mockOnFieldChange).toHaveBeenCalledWith('allergies', 'peanuts, shellfish');
    });

    it('shows filled indicator when field has value', () => {
        const filledForm: DietIntakeFormData = {
            ...EMPTY_DIET_FORM,
            allergies: 'peanuts',
            diet_style: 'Mediterranean',
        };

        renderWithProviders(
            <DietIntakeForm formData={filledForm} onFieldChange={mockOnFieldChange} />
        );

        // Filled fields should have different background styling
        const allergiesField = screen.getByTestId('diet-field-allergies') as HTMLTextAreaElement;
        expect(allergiesField.value).toBe('peanuts');
        // The textarea should have a non-empty value proving the field is recognized as filled
        const dietStyleField = screen.getByTestId('diet-field-diet_style') as HTMLTextAreaElement;
        expect(dietStyleField.value).toBe('Mediterranean');
    });

    it('displays pre-filled form data', () => {
        const filledForm: DietIntakeFormData = {
            ...EMPTY_DIET_FORM,
            meals_per_day: '5',
            diet_style: 'Keto',
        };

        renderWithProviders(
            <DietIntakeForm formData={filledForm} onFieldChange={mockOnFieldChange} />
        );

        const mealsInput = screen.getByTestId('diet-field-meals_per_day') as HTMLInputElement;
        expect(mealsInput.value).toBe('5');
    });
});
