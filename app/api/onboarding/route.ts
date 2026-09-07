/**
 * POST /api/onboarding { messages } → { message, isComplete }
 * The short onboarding chat (six topics). Gated: flash-lite, 600 tokens, 12 turns of history.
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse, type ChatMessage } from '@/lib/ai/gateway';

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
- You are not a medical professional: if the user mentions pain, dizziness or an injury, note it and tell them to see a doctor before training. Never diagnose.
- Start by introducing yourself and asking about their fitness goals.`;

const MOCK_STEPS = [
    "Hi, I'm your SHaiPT coach. What are you training for: building muscle, losing weight, endurance, or general health?",
    'Got it. How experienced are you: beginner, intermediate, or advanced?',
    'What equipment do you have: a full gym, dumbbells at home, bands, or just your bodyweight?',
    'How many days a week can you train?',
    'Any injuries or physical limitations I should plan around?',
    'Any dietary preferences or restrictions?',
    "Thanks. I have what I need: your goals, level, equipment, schedule, limitations and diet. Let's build your plan. [ONBOARDING_COMPLETE]",
];

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { messages } = await req.json() as { messages: ChatMessage[] };
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'messages required' }, { status: 400 });
        }
        const { tester } = await getProfileBits(auth);
        const userTurns = messages.filter((m) => m.role === 'user').length;
        const res = await callModel({
            userId: auth.user.id, tester, feature: 'onboarding_chat', system: SYSTEM_PROMPT, messages,
            mock: () => MOCK_STEPS[Math.min(userTurns, MOCK_STEPS.length - 1)],
        });
        const isComplete = res.text.includes('[ONBOARDING_COMPLETE]');
        return NextResponse.json({ message: res.text.replace('[ONBOARDING_COMPLETE]', '').trim(), isComplete });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[onboarding]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to process onboarding chat';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
