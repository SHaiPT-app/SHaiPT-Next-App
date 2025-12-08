import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/supabaseDb';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { messages, userId, isPrivate = false } = await req.json();

        // System prompt for fitness coaching
        const systemPrompt = `You are SHaiPT AI, an expert fitness coach and personal trainer assistant. Your role is to:

- Help users create personalized training plans
- Explain proper exercise form and technique
- Generate meal plans and nutrition advice
- Answer workout-related questions
- Provide motivation and accountability
- Track progress and suggest improvements

Keep responses concise, actionable, and encouraging. Use fitness terminology appropriately but explain complex concepts clearly. Always prioritize safety and proper form.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Format messages for Gemini
        const history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const lastMessage = messages[messages.length - 1];

        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood! I\'m SHaiPT AI, your fitness coach. I\'m here to help you with training plans, exercise form, nutrition, and all your fitness goals. What can I help you with today?' }]
                },
                ...history
            ]
        });

        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response.text();

        // Save chat if not private
        if (!isPrivate && userId) {
            try {
                await db.aiChats.create({
                    user_id: userId,
                    title: messages[0]?.content?.substring(0, 100) || 'New Conversation',
                    messages: [...messages, {
                        role: 'assistant' as const,
                        content: response,
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch (err) {
                console.error('Failed to save chat:', err);
                // Don't fail the whole request if saving fails
            }
        }

        return NextResponse.json({ message: response });
    } catch (error: any) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process chat' },
            { status: 500 }
        );
    }
}
