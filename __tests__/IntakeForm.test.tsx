import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';
import IntakeForm from '@/components/ai-coach/IntakeForm';
import type { IntakeFormData } from '@/lib/types';

const EMPTY_FORM: IntakeFormData = {
    name: '',
    age: '',
    height: '',
    weight: '',
    sport_history: '',
    training_duration: '',
    training_style: '',
    fitness_goals: '',
    training_days_per_week: '',
    session_duration: '',
    preferred_time: '',
    available_equipment: '',
    training_location: '',
    injuries: '',
    medical_considerations: '',
    fitness_level: '',
};

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <ChakraProvider value={system}>
            {ui}
        </ChakraProvider>
    );
}

describe('IntakeForm', () => {
    const mockOnFieldChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the form header', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        expect(screen.getByText('Client Intake Form')).toBeInTheDocument();
    });

    it('renders all section headers', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        expect(screen.getByText('Basic Information')).toBeInTheDocument();
        expect(screen.getByText('Athletic History')).toBeInTheDocument();
        expect(screen.getByText('Fitness Goals')).toBeInTheDocument();
        expect(screen.getByText('Training Schedule')).toBeInTheDocument();
        expect(screen.getByText('Equipment & Location')).toBeInTheDocument();
        expect(screen.getByText('Medical History')).toBeInTheDocument();
        expect(screen.getByText('Self-Assessment')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        expect(screen.getByTestId('intake-field-name')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-age')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-height')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-weight')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-sport_history')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-training_duration')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-training_style')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-fitness_goals')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-training_days_per_week')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-session_duration')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-preferred_time')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-available_equipment')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-training_location')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-injuries')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-medical_considerations')).toBeInTheDocument();
        expect(screen.getByTestId('intake-field-fitness_level')).toBeInTheDocument();
    });

    it('calls onFieldChange when a field is edited', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        const nameInput = screen.getByTestId('intake-field-name');
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        expect(mockOnFieldChange).toHaveBeenCalledWith('name', 'John Doe');
    });

    it('displays pre-filled form data', () => {
        const filledForm: IntakeFormData = {
            ...EMPTY_FORM,
            name: 'Jane Smith',
            age: '25',
            fitness_goals: 'Build muscle',
        };

        renderWithProviders(<IntakeForm formData={filledForm} onFieldChange={mockOnFieldChange} />);
        expect(screen.getByTestId('intake-field-name')).toHaveValue('Jane Smith');
        expect(screen.getByTestId('intake-field-age')).toHaveValue('25');
        expect(screen.getByTestId('intake-field-fitness_goals')).toHaveValue('Build muscle');
    });

    it('renders the description text', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        expect(
            screen.getByText('This form auto-fills as you chat with your coach. You can also edit fields directly.')
        ).toBeInTheDocument();
    });

    it('calls onFieldChange for textarea fields', () => {
        renderWithProviders(<IntakeForm formData={EMPTY_FORM} onFieldChange={mockOnFieldChange} />);
        const goalsField = screen.getByTestId('intake-field-fitness_goals');
        fireEvent.change(goalsField, { target: { value: 'Lose fat, gain muscle' } });
        expect(mockOnFieldChange).toHaveBeenCalledWith('fitness_goals', 'Lose fat, gain muscle');
    });
});
