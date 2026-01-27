import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/supabaseDb';
import { NextRequest } from 'next/server';
import type { AIChatMessage } from '@/lib/types';

const MOCK_RESPONSES = [
    "I'd be happy to help with your fitness goals! Based on your profile, I'd recommend focusing on progressive overload in your key compound movements. Try adding 2.5-5lbs each week to your main lifts.",
    "Great question! For optimal recovery, make sure you're getting 7-9 hours of sleep, eating enough protein (0.8-1g per pound of bodyweight), and staying hydrated throughout the day.",
    "Looking at your recent workouts, you've been making solid progress. Consider adding a deload week every 4-6 weeks to allow your body to recover and come back stronger.",
    "Nutrition is key for your goals. I'd suggest tracking your macros for at least a week to understand your current intake, then we can make targeted adjustments.",
];

function getMockResponse(): string {
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

/** Build a rich context string from the user's profile, plans, and workout history */
async function buildUserContext(userId: string): Promise<string> {
    const contextParts: string[] = [];

    try {
        const [profile, activeAssignment, recentLogs] = await Promise.all([
            db.profiles.getById(userId).catch(() => null),
            db.trainingPlanAssignments.getActiveByUser(userId).catch(() => null),
            db.workoutLogs.getByUser(userId, 10).catch(() => []),
        ]);

        // Profile context
        if (profile) {
            contextParts.push(`User: ${profile.full_name || profile.username || 'Unknown'}`);
            if (profile.fitness_goals?.length) {
                contextParts.push(`Fitness goals: ${profile.fitness_goals.join(', ')}`);
            }
            if (profile.height_cm) contextParts.push(`Height: ${profile.height_cm}cm`);
            if (profile.weight_kg) contextParts.push(`Weight: ${profile.weight_kg}kg`);
            if (profile.gender) contextParts.push(`Gender: ${profile.gender}`);
            if (profile.preferred_weight_unit) contextParts.push(`Preferred weight unit: ${profile.preferred_weight_unit}`);
            if (profile.bio) contextParts.push(`Bio: ${profile.bio}`);
        }

        // Active training plan context
        if (activeAssignment) {
            try {
                const plan = await db.trainingPlans.getById(activeAssignment.plan_id);
                if (plan) {
                    contextParts.push(`\nActive training plan: "${plan.name}"`);
                    if (plan.description) contextParts.push(`Plan description: ${plan.description}`);
                    if (plan.duration_weeks) contextParts.push(`Plan duration: ${plan.duration_weeks} weeks`);
                    contextParts.push(`Plan dates: ${activeAssignment.start_date} to ${activeAssignment.end_date}`);

                    // Fetch plan sessions for workout details
                    const sessions = await db.trainingPlanSessions.getByPlan(plan.id).catch(() => []);
                    if (sessions.length > 0) {
                        contextParts.push(`Plan has ${sessions.length} scheduled sessions`);
                    }
                }
            } catch {
                // Non-critical, continue without plan details
            }
        }

        // Recent workout logs with details
        const recentLogsSlice = (recentLogs || []).slice(0, 5);
        if (recentLogsSlice.length > 0) {
            contextParts.push(`\nRecent workouts (${recentLogsSlice.length} sessions):`);
            for (const log of recentLogsSlice) {
                const parts = [`- ${log.date}`];
                if (log.total_duration_seconds) {
                    const mins = Math.round(log.total_duration_seconds / 60);
                    parts.push(`${mins} min`);
                }
                if (log.notes) parts.push(`notes: "${log.notes}"`);
                contextParts.push(parts.join(' '));
            }
        }
    } catch (err) {
        console.error('Failed to fetch user context:', err);
    }

    if (contextParts.length === 0) return '';
    return `\n\nCurrent user context:\n${contextParts.join('\n')}`;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userId, chatId } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build user context for the system prompt
        const userContext = userId ? await buildUserContext(userId) : '';

        const systemPrompt = `You are SHaiPT AI Coach, an expert fitness coach and personal trainer. You have deep knowledge of exercise science, nutrition, and training programming.${userContext}

Your personality:
- Encouraging but honest — give real advice, not just hype
- Concise and actionable — keep responses focused
- Safety-first — always prioritize proper form and injury prevention
- Data-aware — reference the user's goals, recent workouts, and plan when relevant

You help with:
- Training plan adjustments and exercise recommendations
- Form and technique guidance
- Nutrition and recovery advice
- Progress analysis and goal setting
- Motivation and accountability

Keep responses concise (2-4 paragraphs max). Use markdown formatting when listing exercises or plans. Never use emojis.`;

        // Check for API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Return mock streaming response when no API key
            const mockResponse = getMockResponse();
            const encoder = new TextEncoder();

            // Save to chat history and get chatId
            let savedChatId = chatId;
            if (userId) {
                const allMessages: AIChatMessage[] = [
                    ...messages.map((m: { role: string; content: string }) => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                        timestamp: new Date().toISOString(),
                    })),
                    {
                        role: 'assistant' as const,
                        content: mockResponse,
                        timestamp: new Date().toISOString(),
                    },
                ];
                savedChatId = await saveChatHistory(userId, chatId, allMessages, messages[0]?.content);
            }

            const stream = new ReadableStream({
                async start(controller) {
                    const words = mockResponse.split(' ');
                    for (const word of words) {
                        controller.enqueue(encoder.encode(word + ' '));
                        await new Promise(r => setTimeout(r, 50));
                    }
                    controller.close();
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    ...(savedChatId ? { 'X-Chat-Id': savedChatId } : {}),
                },
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Format message history for Gemini
        const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const lastMessage = messages[messages.length - 1];

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                {
                    role: 'model',
                    parts: [{ text: "Understood. I'm SHaiPT AI Coach, ready to help with training, nutrition, and all your fitness goals. What can I help you with?" }],
                },
                ...history,
            ],
        });

        // Stream the response
        let fullResponse = '';
        const savedChatId = chatId;
        try {
            const result = await chat.sendMessageStream(lastMessage.content);
            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of result.stream) {
                            const text = chunk.text();
                            if (text) {
                                fullResponse += text;
                                controller.enqueue(encoder.encode(text));
                            }
                        }
                        controller.close();

                        // Save chat history after stream completes
                        if (userId) {
                            const allMessages: AIChatMessage[] = [
                                ...messages.map((m: { role: string; content: string }) => ({
                                    role: m.role as 'user' | 'assistant',
                                    content: m.content,
                                    timestamp: new Date().toISOString(),
                                })),
                                {
                                    role: 'assistant' as const,
                                    content: fullResponse,
                                    timestamp: new Date().toISOString(),
                                },
                            ];
                            await saveChatHistory(userId, savedChatId, allMessages, messages[0]?.content);
                        }
                    } catch (streamError: unknown) {
                        // Handle rate limiting
                        const sErr = streamError as { status?: number; message?: string };
                        if (sErr?.status === 429 || sErr?.message?.includes('429')) {
                            const retryMsg = 'I\'m currently rate-limited. Please wait a moment and try again.';
                            controller.enqueue(encoder.encode(retryMsg));
                        } else {
                            controller.enqueue(encoder.encode('Sorry, I encountered an error. Please try again.'));
                        }
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    ...(savedChatId ? { 'X-Chat-Id': savedChatId } : {}),
                },
            });
        } catch (error: unknown) {
            // Handle 429 rate limit at the top level
            const err = error as { status?: number; message?: string };
            if (err?.status === 429 || err?.message?.includes('429')) {
                return new Response(
                    JSON.stringify({ error: 'Rate limited. Please wait a moment and try again.' }),
                    { status: 429, headers: { 'Content-Type': 'application/json' } }
                );
            }
            throw error;
        }
    } catch (error: unknown) {
        console.error('AI Coach chat error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process chat';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/** Save or update chat history in the ai_chats table. Returns the chatId. */
async function saveChatHistory(
    userId: string,
    chatId: string | undefined,
    messages: AIChatMessage[],
    firstMessageContent?: string
): Promise<string | undefined> {
    try {
        if (chatId) {
            await db.aiChats.update(chatId, { messages });
            return chatId;
        } else {
            const created = await db.aiChats.create({
                user_id: userId,
                title: firstMessageContent?.substring(0, 100) || 'AI Coach Chat',
                messages,
            });
            return created.id;
        }
    } catch (err) {
        console.error('Failed to save chat history:', err);
        return undefined;
    }
}
