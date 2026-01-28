/**
 * @jest-environment node
 */

const mockGenerateContent = jest.fn()

jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn(() => ({
            getGenerativeModel: jest.fn(() => ({
                generateContent: mockGenerateContent,
            })),
        })),
    }
})

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/onboarding/generate-plans/route'

const mockPlanResponse = {
    extracted_profile: {
        fitness_goals: ['build_muscle', 'lose_fat'],
        experience_level: 'intermediate',
        available_equipment: ['full_gym'],
        training_days_per_week: 4,
        injuries_limitations: [],
        dietary_preferences: ['no_preference'],
    },
    training_plan: {
        name: '4-Week Hypertrophy Program',
        description: 'A progressive hypertrophy program for intermediate lifters',
        duration_weeks: 4,
        sessions: [
            {
                name: 'Upper Body Push',
                description: 'Chest, shoulders, triceps focus',
                day_number: 1,
                week_number: 1,
                exercises: [
                    {
                        exercise_name: 'Barbell Bench Press',
                        sets: [
                            { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
                            { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
                            { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
                        ],
                        notes: 'Focus on controlled eccentric',
                    },
                ],
            },
        ],
    },
    nutrition_plan: {
        daily_calories: 2500,
        macros: { protein_g: 180, carbs_g: 280, fat_g: 78 },
        meal_plan: [
            {
                day_number: 1,
                meals: [
                    {
                        meal_type: 'breakfast',
                        name: 'Protein Oatmeal',
                        ingredients: ['oats', 'protein powder', 'banana'],
                        calories: 450,
                        protein_g: 35,
                        carbs_g: 55,
                        fat_g: 10,
                        prep_time_minutes: 10,
                    },
                ],
            },
        ],
        shopping_list: ['oats', 'protein powder', 'bananas'],
        notes: 'Eat protein with every meal',
    },
}

describe('POST /api/onboarding/generate-plans', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns generated plans from conversation', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify(mockPlanResponse),
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [
                    { role: 'assistant', content: 'What are your fitness goals?' },
                    { role: 'user', content: 'Build muscle and lose fat' },
                    { role: 'assistant', content: 'What is your experience level?' },
                    { role: 'user', content: 'Intermediate' },
                ],
                userId: 'user-123',
            }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.training_plan.name).toBe('4-Week Hypertrophy Program')
        expect(data.data.nutrition_plan.daily_calories).toBe(2500)
        expect(data.data.extracted_profile.fitness_goals).toContain('build_muscle')
    })

    it('handles JSON wrapped in markdown code blocks', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => '```json\n' + JSON.stringify(mockPlanResponse) + '\n```',
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Build muscle' }],
                userId: 'user-123',
            }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.training_plan).toBeDefined()
    })

    it('returns 400 when messages are missing', async () => {
        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({ userId: 'user-123' }),
        })

        const response = await POST(req)
        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data.error).toBe('Messages and userId are required')
    })

    it('returns 400 when userId is missing', async () => {
        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello' }],
            }),
        })

        const response = await POST(req)
        expect(response.status).toBe(400)
    })

    it('returns 500 on Gemini API error', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'))

        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello' }],
                userId: 'user-123',
            }),
        })

        const response = await POST(req)
        expect(response.status).toBe(500)

        const data = await response.json()
        expect(data.error).toBe('API quota exceeded')
    })

    it('returns 500 when Gemini returns invalid JSON', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => 'This is not valid JSON at all',
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello' }],
                userId: 'user-123',
            }),
        })

        const response = await POST(req)
        expect(response.status).toBe(500)
    })

    it('includes conversation text in the prompt', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => JSON.stringify(mockPlanResponse),
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding/generate-plans', {
            method: 'POST',
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'I want to build muscle' },
                    { role: 'assistant', content: 'Great goal!' },
                ],
                userId: 'user-123',
            }),
        })

        await POST(req)

        expect(mockGenerateContent).toHaveBeenCalledWith(
            expect.stringContaining('I want to build muscle')
        )
        expect(mockGenerateContent).toHaveBeenCalledWith(
            expect.stringContaining('Great goal!')
        )
    })
})
