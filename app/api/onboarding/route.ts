import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are SHaiPT AI Coach, conducting an onboarding interview with a new user. Your goal is to learn about them so you can create the best personalized fitness experience.

You need to collect the following information through natural conversation (one topic at a time):
1. Fitness goals (e.g., build muscle, lose weight, improve endurance, flexibility, general health)
2. Experience level (beginner, intermediate, advanced)
3. Available equipment (home gym, full gym, bodyweight only, dumbbells, resistance bands, etc.)
4. Training frequency (how many days per week they can train)
5. Injuries or physical limitations
6. Dietary preferences or restrictions (vegan, keto, allergies, no preference, etc.)

RULES:
- Ask about ONE topic at a time. Do not ask about multiple topics in one message.
- Be conversational, warm, and encouraging. Keep messages concise (2-4 sentences max).
- After the user responds to a topic, acknowledge their answer briefly, then move to the next topic.
- Do NOT repeat topics already covered.
- When ALL 6 topics have been covered, respond with a summary of what you learned and end with the exact marker: [ONBOARDING_COMPLETE]
- The summary before [ONBOARDING_COMPLETE] should be a brief recap in a friendly tone.
- Start by introducing yourself and asking about their fitness goals.`;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json() as { messages: ChatMessage[] };

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const history = messages.slice(0, -1).map((msg: ChatMessage) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const lastMessage = messages[messages.length - 1];

        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                {
                    role: 'model',
                    parts: [{ text: "Understood! I'll conduct the onboarding interview naturally, asking one topic at a time." }],
                },
                ...history,
            ],
        });

        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response.text();

        const isComplete = response.includes('[ONBOARDING_COMPLETE]');
        const cleanResponse = response.replace('[ONBOARDING_COMPLETE]', '').trim();

        return NextResponse.json({
            message: cleanResponse,
            isComplete,
        });
    } catch (error: unknown) {
        console.error('Onboarding chat error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process onboarding chat';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
