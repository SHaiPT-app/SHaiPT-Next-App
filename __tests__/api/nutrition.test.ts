/**
 * @jest-environment node
 */
import { GET } from '@/app/api/nutrition/route';

// Mock supabaseDb
const mockGetLatestByUser = jest.fn()

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        nutritionPlans: {
            getLatestByUser: (...args: unknown[]) => mockGetLatestByUser(...args),
        },
    },
}))

function createRequest(url: string) {
    return new Request(url)
}

describe('/api/nutrition GET', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 400 when userId is missing', async () => {
        const req = createRequest('http://localhost/api/nutrition')
        const res = await GET(req as any)
        const data = await res.json()

        expect(res.status).toBe(400)
        expect(data.error).toBe('userId is required')
    })

    it('returns null plan when no plan exists', async () => {
        mockGetLatestByUser.mockResolvedValue(null)

        const req = createRequest('http://localhost/api/nutrition?userId=user-1')
        const res = await GET(req as any)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data.plan).toBeNull()
        expect(mockGetLatestByUser).toHaveBeenCalledWith('user-1')
    })

    it('returns plan when one exists', async () => {
        const mockPlan = {
            id: 'plan-1',
            user_id: 'user-1',
            name: '7-Day Meal Plan',
            dietary_preferences: ['vegan'],
            plan_overview: {
                duration_days: 7,
                daily_calories: 2200,
                macros: { calories: 2200, protein_g: 165, carbs_g: 220, fat_g: 73 },
            },
            daily_schedule: {},
        }

        mockGetLatestByUser.mockResolvedValue(mockPlan)

        const req = createRequest('http://localhost/api/nutrition?userId=user-1')
        const res = await GET(req as any)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data.plan.id).toBe('plan-1')
        expect(data.plan.name).toBe('7-Day Meal Plan')
    })

    it('returns 500 on database error', async () => {
        mockGetLatestByUser.mockRejectedValue(new Error('DB error'))

        const req = createRequest('http://localhost/api/nutrition?userId=user-1')
        const res = await GET(req as any)
        const data = await res.json()

        expect(res.status).toBe(500)
        expect(data.error).toBe('Failed to fetch nutrition plan')
    })
})
