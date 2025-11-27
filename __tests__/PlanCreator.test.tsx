import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlanCreator from '@/components/PlanCreator'
import { supabase } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: {
                    session: { access_token: 'mock-token' }
                }
            }),
        },
    },
}))

jest.mock('@/components/ExerciseSearch', () => {
    return function MockExerciseSearch({ onSelectExercise }: { onSelectExercise: (ex: any) => void }) {
        return (
            <button
                data-testid="mock-exercise-search"
                onClick={() => onSelectExercise({ name: 'Bench Press', exercise_id: 'ex-1', gif_url: 'url' })}
            >
                Select Bench Press
            </button>
        )
    }
})

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
) as jest.Mock

describe('PlanCreator', () => {
    const mockOnSave = jest.fn()
    const mockOnCancel = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders plan creator form', () => {
        render(
            <PlanCreator
                traineeId="trainee-1"
                trainerId="trainer-1"
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        )

        expect(screen.getByText('Create New Workout Plan')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Plan Name (e.g., Chest & Triceps)')).toBeInTheDocument()
        expect(screen.getByText('+ Add Exercise')).toBeInTheDocument()
    })

    it('allows adding an exercise', () => {
        render(
            <PlanCreator
                traineeId="trainee-1"
                trainerId="trainer-1"
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        )

        fireEvent.click(screen.getByText('+ Add Exercise'))

        expect(screen.getByText('Exercise 1')).toBeInTheDocument()
        expect(screen.getByTestId('mock-exercise-search')).toBeInTheDocument()
    })

    it('handles plan submission', async () => {
        render(
            <PlanCreator
                traineeId="trainee-1"
                trainerId="trainer-1"
                onSave={mockOnSave}
                onCancel={mockOnCancel}
            />
        )

        // Check if button exists initially
        expect(screen.getByRole('button', { name: /save plan/i })).toBeInTheDocument()

        // Enter plan name
        fireEvent.change(screen.getByPlaceholderText('Plan Name (e.g., Chest & Triceps)'), {
            target: { value: 'My New Plan' }
        })

        // Add exercise
        fireEvent.click(screen.getByText('+ Add Exercise'))

        // Select exercise from mock search
        fireEvent.click(screen.getByTestId('mock-exercise-search'))

        // Submit form
        const saveButton = await screen.findByRole('button', { name: /save plan/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/plans', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('My New Plan'),
            }))
            expect(mockOnSave).toHaveBeenCalled()
        })
    })
})
