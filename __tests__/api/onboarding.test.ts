/**
 * @jest-environment node
 */

const mockSendMessage = jest.fn()
const mockStartChat = jest.fn(() => ({
    sendMessage: mockSendMessage,
}))

jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn(() => ({
            getGenerativeModel: jest.fn(() => ({
                startChat: mockStartChat,
            })),
        })),
    }
})

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/onboarding/route'

describe('POST /api/onboarding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns AI response for onboarding messages', async () => {
        mockSendMessage.mockResolvedValue({
            response: {
                text: () => 'Great! What is your experience level?',
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding', {
            method: 'POST',
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'I want to build muscle and lose fat' },
                ],
            }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(data.message).toBe('Great! What is your experience level?')
        expect(data.isComplete).toBe(false)
        expect(mockStartChat).toHaveBeenCalled()
        expect(mockSendMessage).toHaveBeenCalledWith('I want to build muscle and lose fat')
    })

    it('detects onboarding completion marker', async () => {
        mockSendMessage.mockResolvedValue({
            response: {
                text: () => 'Great summary of your profile! [ONBOARDING_COMPLETE]',
            },
        })

        const req = new NextRequest('http://localhost:3000/api/onboarding', {
            method: 'POST',
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'No dietary restrictions' },
                ],
            }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(data.isComplete).toBe(true)
        expect(data.message).toBe('Great summary of your profile!')
        expect(data.message).not.toContain('[ONBOARDING_COMPLETE]')
    })

    it('passes message history to Gemini correctly', async () => {
        mockSendMessage.mockResolvedValue({
            response: {
                text: () => 'What equipment do you have access to?',
            },
        })

        const messages = [
            { role: 'user' as const, content: 'Build muscle' },
            { role: 'assistant' as const, content: 'Great goal! What is your experience?' },
            { role: 'user' as const, content: 'Intermediate' },
        ]

        const req = new NextRequest('http://localhost:3000/api/onboarding', {
            method: 'POST',
            body: JSON.stringify({ messages }),
        })

        await POST(req)

        // history should contain all messages except the last one
        expect(mockStartChat).toHaveBeenCalledWith(
            expect.objectContaining({
                history: expect.arrayContaining([
                    // System prompt pair
                    expect.objectContaining({ role: 'user' }),
                    expect.objectContaining({ role: 'model' }),
                    // First user message
                    expect.objectContaining({
                        role: 'user',
                        parts: [{ text: 'Build muscle' }],
                    }),
                    // Assistant message mapped to 'model'
                    expect.objectContaining({
                        role: 'model',
                        parts: [{ text: 'Great goal! What is your experience?' }],
                    }),
                ]),
            })
        )

        // Last message sent directly
        expect(mockSendMessage).toHaveBeenCalledWith('Intermediate')
    })

    it('returns 500 on Gemini API error', async () => {
        mockSendMessage.mockRejectedValue(new Error('API quota exceeded'))

        const req = new NextRequest('http://localhost:3000/api/onboarding', {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Hello' }],
            }),
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('API quota exceeded')
    })
})
