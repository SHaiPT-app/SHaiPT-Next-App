import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
    }),
}))

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import NutritionPage from '@/app/(main)/nutrition/page'
import type { NutritionPlan } from '@/lib/types'

const mockPlan: NutritionPlan = {
    id: 'plan-1',
    user_id: 'user-1',
    name: '7-Day Meal Plan',
    dietary_preferences: ['vegan', 'keto'],
    plan_overview: {
        duration_days: 7,
        daily_calories: 2200,
        macros: {
            calories: 2200,
            protein_g: 165,
            carbs_g: 220,
            fat_g: 73,
        },
        key_principles: ['Balanced nutrition', 'High protein'],
    },
    daily_schedule: {
        day_1: {
            breakfast: {
                name: 'Protein Oatmeal',
                ingredients: ['Oats', 'Protein powder', 'Banana'],
                instructions: 'Cook oats and mix in protein powder.',
                prep_time_minutes: 10,
                nutrition: { calories: 450, protein_g: 35, carbs_g: 55, fat_g: 12 },
            },
            lunch: {
                name: 'Chicken Bowl',
                ingredients: ['Chicken', 'Rice', 'Vegetables'],
                instructions: 'Grill chicken, serve over rice with vegetables.',
                prep_time_minutes: 25,
                nutrition: { calories: 650, protein_g: 50, carbs_g: 70, fat_g: 18 },
            },
            dinner: {
                name: 'Salmon and Sweet Potato',
                ingredients: ['Salmon', 'Sweet potato', 'Broccoli'],
                instructions: 'Bake salmon and sweet potato. Steam broccoli.',
                prep_time_minutes: 30,
                nutrition: { calories: 700, protein_g: 55, carbs_g: 60, fat_g: 25 },
            },
            snacks: [{
                name: 'Greek Yogurt',
                ingredients: ['Greek yogurt', 'Berries'],
                nutrition: { calories: 200, protein_g: 20, carbs_g: 25, fat_g: 5 },
            }],
        },
        day_2: {
            breakfast: {
                name: 'Scrambled Eggs',
                ingredients: ['Eggs', 'Spinach', 'Toast'],
                nutrition: { calories: 400, protein_g: 30, carbs_g: 35, fat_g: 18 },
            },
            lunch: {
                name: 'Turkey Wrap',
                ingredients: ['Turkey', 'Wrap', 'Lettuce'],
                nutrition: { calories: 550, protein_g: 40, carbs_g: 50, fat_g: 15 },
            },
            dinner: {
                name: 'Beef Stir Fry',
                ingredients: ['Beef', 'Vegetables', 'Soy sauce'],
                nutrition: { calories: 650, protein_g: 45, carbs_g: 55, fat_g: 22 },
            },
        },
    },
    shopping_list: {
        proteins: ['Chicken breast', 'Salmon', 'Eggs'],
        vegetables: ['Broccoli', 'Spinach'],
        grains: ['Oats', 'Rice'],
    },
    nutrition_tips: [
        'Stay hydrated',
        'Eat protein with every meal',
    ],
    created_at: '2025-01-01T00:00:00Z',
}

describe('NutritionPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockReset()

        // Set up localStorage with user
        Storage.prototype.getItem = jest.fn((key: string) => {
            if (key === 'user') {
                return JSON.stringify({
                    id: 'user-1',
                    email: 'test@example.com',
                    full_name: 'Test User',
                })
            }
            return null
        })
    })

    it('renders the page header', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: null }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Nutrition Plan')).toBeInTheDocument()
        })

        expect(screen.getByText('AI-generated meal plans tailored to your goals and preferences')).toBeInTheDocument()
    })

    it('shows empty state when no plan exists', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: null }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('No nutrition plan yet')).toBeInTheDocument()
        })

        expect(screen.getByText('Generate Meal Plan')).toBeInTheDocument()
    })

    it('displays plan overview with daily targets when plan exists', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('7-Day Meal Plan')).toBeInTheDocument()
        })

        // Check macro values are displayed
        expect(screen.getByText('2200 kcal')).toBeInTheDocument()
        expect(screen.getByText('165g')).toBeInTheDocument() // protein
        expect(screen.getByText('220g')).toBeInTheDocument() // carbs
        expect(screen.getByText('73g')).toBeInTheDocument()  // fat
    })

    it('displays dietary preference tags', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Vegan')).toBeInTheDocument()
        })

        expect(screen.getByText('Keto')).toBeInTheDocument()
    })

    it('shows day cards with daily macro totals', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            // Day 1 appears in both the pill selector and the day card
            expect(screen.getAllByText('Day 1').length).toBeGreaterThanOrEqual(2)
        })

        expect(screen.getAllByText('Day 2').length).toBeGreaterThanOrEqual(2)
    })

    it('expands day card to show meals when clicked', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByTestId('day-header-day_1')).toBeInTheDocument()
        })

        // Click day 1 header
        const dayHeader = screen.getByTestId('day-header-day_1')
        fireEvent.click(dayHeader)

        // Should show meals
        await waitFor(() => {
            expect(screen.getByText('Protein Oatmeal')).toBeInTheDocument()
        })

        expect(screen.getByText('Chicken Bowl')).toBeInTheDocument()
        expect(screen.getByText('Salmon and Sweet Potato')).toBeInTheDocument()
        expect(screen.getByText('Greek Yogurt')).toBeInTheDocument()
    })

    it('shows meal details when meal card is expanded', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByTestId('day-header-day_1')).toBeInTheDocument()
        })

        // Expand day 1
        fireEvent.click(screen.getByTestId('day-header-day_1'))

        await waitFor(() => {
            expect(screen.getByText('Protein Oatmeal')).toBeInTheDocument()
        })

        // Click on the breakfast meal card (find the button containing 'Protein Oatmeal')
        const mealButton = screen.getByText('Protein Oatmeal').closest('button')!
        fireEvent.click(mealButton)

        // Should show ingredients
        await waitFor(() => {
            expect(screen.getByText('Oats')).toBeInTheDocument()
        })

        expect(screen.getByText('Protein powder')).toBeInTheDocument()
        expect(screen.getByText('10 min prep')).toBeInTheDocument()
    })

    it('filters days when a day selector pill is clicked', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByTestId('day-header-day_1')).toBeInTheDocument()
        })

        // Both days visible initially
        expect(screen.getByTestId('day-header-day_2')).toBeInTheDocument()

        // Click Day 1 filter pill (the first "Day 1" text is the pill button)
        const day1Elements = screen.getAllByText('Day 1')
        fireEvent.click(day1Elements[0])

        // Day 2 card should be hidden now
        await waitFor(() => {
            expect(screen.queryByTestId('day-header-day_2')).not.toBeInTheDocument()
        })
    })

    it('toggles shopping list panel', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Shopping List')).toBeInTheDocument()
        })

        // Click shopping list button
        fireEvent.click(screen.getByText('Shopping List'))

        // Should show shopping list items
        await waitFor(() => {
            expect(screen.getByText('Chicken breast')).toBeInTheDocument()
        })

        expect(screen.getByText('Salmon')).toBeInTheDocument()
        expect(screen.getByText('Broccoli')).toBeInTheDocument()
    })

    it('toggles nutrition tips panel', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Nutrition Tips')).toBeInTheDocument()
        })

        // Click tips button
        fireEvent.click(screen.getByText('Nutrition Tips'))

        await waitFor(() => {
            expect(screen.getByText('Stay hydrated')).toBeInTheDocument()
        })

        expect(screen.getByText('Eat protein with every meal')).toBeInTheDocument()
    })

    it('calls generate API when generate button is clicked', async () => {
        // First call: fetch returns no plan
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: null }),
        })

        // Second call: generate returns a plan
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Generate Meal Plan')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Generate Meal Plan'))

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/nutrition/generate', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ userId: 'user-1' }),
            }))
        })
    })

    it('shows error message when generation fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: null }),
        })

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'API key not configured' }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Generate Meal Plan')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Generate Meal Plan'))

        await waitFor(() => {
            expect(screen.getByText('API key not configured')).toBeInTheDocument()
        })
    })

    it('redirects to landing if no user in localStorage', () => {
        Storage.prototype.getItem = jest.fn(() => null)

        render(<NutritionPage />)

        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('shows regenerate button when plan exists', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('Regenerate')).toBeInTheDocument()
        })
    })

    it('shows All Days pill button selected by default', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ plan: mockPlan }),
        })

        render(<NutritionPage />)

        await waitFor(() => {
            expect(screen.getByText('All Days')).toBeInTheDocument()
        })
    })
})
