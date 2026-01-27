import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: jest.fn(),
    }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

import GroceryListPage from '@/app/(main)/nutrition/grocery/page'
import type { GroceryList } from '@/lib/types'

const mockGroceryList: GroceryList = {
    id: 'list-1',
    user_id: 'user-1',
    nutrition_plan_id: 'plan-1',
    name: 'Grocery List - 7-Day Meal Plan',
    items: [
        { name: 'Chicken breast', category: 'proteins', quantity: 'Chicken breast', checked: false },
        { name: 'Salmon fillet', category: 'proteins', quantity: 'Salmon fillet', checked: false },
        { name: 'Broccoli', category: 'vegetables', quantity: 'Broccoli', checked: false },
        { name: 'Spinach', category: 'vegetables', quantity: 'Spinach', checked: true },
        { name: 'Banana', category: 'fruits', quantity: 'Banana', checked: false },
        { name: 'Rolled oats', category: 'grains', quantity: 'Rolled oats', checked: false },
        { name: 'Olive oil', category: 'pantry', quantity: 'Olive oil', checked: false },
        { name: 'Greek yogurt', category: 'dairy', quantity: 'Greek yogurt', checked: false },
    ],
    is_completed: false,
    created_at: '2025-01-01T00:00:00Z',
}

describe('GroceryListPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockReset()

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
            json: async () => ({ lists: [] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Grocery List')).toBeInTheDocument()
        })

        expect(screen.getByText('Auto-generated from your active meal plan')).toBeInTheDocument()
    })

    it('shows empty state when no grocery lists exist', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('No grocery list yet')).toBeInTheDocument()
        })

        expect(screen.getByText('Generate Grocery List')).toBeInTheDocument()
    })

    it('displays grocery list with categorized items', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [mockGroceryList] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Grocery List - 7-Day Meal Plan')).toBeInTheDocument()
        })

        // Check category headers
        expect(screen.getByText('Proteins')).toBeInTheDocument()
        expect(screen.getByText('Vegetables')).toBeInTheDocument()
        expect(screen.getByText('Fruits')).toBeInTheDocument()
        expect(screen.getByText('Grains & Starches')).toBeInTheDocument()
        expect(screen.getByText('Pantry Staples')).toBeInTheDocument()
        expect(screen.getByText('Dairy')).toBeInTheDocument()
    })

    it('displays item names within categories', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [mockGroceryList] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Chicken breast')).toBeInTheDocument()
        })

        expect(screen.getByText('Salmon fillet')).toBeInTheDocument()
        expect(screen.getByText('Broccoli')).toBeInTheDocument()
        expect(screen.getByText('Banana')).toBeInTheDocument()
        expect(screen.getByText('Rolled oats')).toBeInTheDocument()
        expect(screen.getByText('Olive oil')).toBeInTheDocument()
    })

    it('shows progress count', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [mockGroceryList] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            // 1 checked out of 8 total
            expect(screen.getByText('1/8 items')).toBeInTheDocument()
        })
    })

    it('toggles item checked state on click', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [mockGroceryList] }),
        })

        // Mock the PATCH call for toggling
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ list: mockGroceryList }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Chicken breast')).toBeInTheDocument()
        })

        // Click on chicken breast to toggle
        const chickenButton = screen.getByText('Chicken breast').closest('button')!
        fireEvent.click(chickenButton)

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/grocery-lists', expect.objectContaining({
                method: 'PATCH',
            }))
        })
    })

    it('calls generate API when generate button is clicked', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [] }),
        })

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ list: mockGroceryList }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Generate Grocery List')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Generate Grocery List'))

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith('/api/grocery-lists/generate', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ userId: 'user-1' }),
            }))
        })
    })

    it('shows error when generation fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [] }),
        })

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'No nutrition plan found. Generate a meal plan first.' }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Generate Grocery List')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Generate Grocery List'))

        await waitFor(() => {
            expect(screen.getByText('No nutrition plan found. Generate a meal plan first.')).toBeInTheDocument()
        })
    })

    it('navigates back to nutrition page when back button is clicked', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Back to Nutrition')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Back to Nutrition'))

        expect(mockPush).toHaveBeenCalledWith('/nutrition')
    })

    it('redirects to landing if no user in localStorage', () => {
        Storage.prototype.getItem = jest.fn(() => null)

        render(<GroceryListPage />)

        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('shows regenerate button when list exists', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ lists: [mockGroceryList] }),
        })

        render(<GroceryListPage />)

        await waitFor(() => {
            expect(screen.getByText('Regenerate')).toBeInTheDocument()
        })
    })
})
