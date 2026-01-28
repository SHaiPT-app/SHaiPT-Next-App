import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import type { DietIntakeFormData } from '@/lib/types';

const DIET_STYLES = [
    'Keto', 'Vegan', 'Vegetarian', 'Mediterranean', 'Paleo',
    'Flexible Dieting / IIFYM', 'Halal', 'Kosher', 'Whole30',
    'Carnivore', 'Pescatarian', 'Gluten-Free', 'Dairy-Free',
    'Low-FODMAP', 'No Specific Diet',
];

const DIETITIAN_PERSONALITY = `You are Dr. Nadia "The Fuel," a registered dietitian and sports nutritionist. You are professional but approachable, warm and knowledgeable. You explain the science behind nutrition choices in clear, accessible language. You adapt easily to any dietary restriction or preference without judgment. Your tone is encouraging and evidence-based -- "the research shows," "based on your training load," and "let's fuel your performance." You believe food is medicine and fuel, not punishment.`;

const INTERVIEW_TOPICS = [
    'food allergies and intolerances (ask specifically about common ones: nuts, dairy, gluten, shellfish, soy, eggs)',
    `dietary preferences -- present this list of diet styles and ask which resonates: ${DIET_STYLES.join(', ')}. Let them pick one or describe their own approach`,
    'foods they love -- what meals, ingredients, or cuisines they enjoy most',
    'foods they hate -- what they absolutely will not eat',
    'any medical or dietary considerations (diabetes, PCOS, IBS, cholesterol, blood pressure, etc.)',
    'how many meals per day they prefer and their cooking preferences (meal prep, quick meals, enjoy cooking, minimal cooking, etc.)',
];

function buildDietitianSystemPrompt(previousContext?: { role: string; content: string }[]): string {
    let contextInfo = '';
    if (previousContext && previousContext.length > 0) {
        const userInfo = previousContext
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join(' ');
        if (userInfo) {
            contextInfo = `\n\nCONTEXT FROM TRAINING INTAKE: The client has already completed a training intake interview. Here is some of what they shared: "${userInfo.substring(0, 500)}". Use this context to personalize your approach but do NOT repeat questions they already answered about training. Focus exclusively on nutrition topics.`;
        }
    }

    return `${DIETITIAN_PERSONALITY}

You are conducting a nutrition intake interview to learn about a client's dietary needs before building their personalized nutrition and meal plan. Your job is to ask questions conversationally -- one or two topics at a time, never all at once. Keep the conversation natural and engaging.

You need to gather the following information during the interview (in roughly this order):
${INTERVIEW_TOPICS.map((q, i) => `${i + 1}. ${q}`).join('\n')}

IMPORTANT RULES:
- Ask about 1-2 topics per message. Do NOT dump all questions at once.
- React to what the user tells you with genuine interest and briefly explain why that information matters nutritionally before moving to the next topic.
- Stay in character throughout the conversation.
- When presenting diet style options, format them as a clear list so the user can easily pick.
- When you have gathered ALL required information, end your message with the exact phrase "[INTERVIEW_COMPLETE]" (this will be hidden from the user).
- Keep responses concise (2-3 paragraphs max).
- Never use emojis.
- If the user provides information about multiple topics at once, acknowledge all of it and move on to the remaining topics.
- If you detect the user has already provided certain information in previous messages, do not ask again.
${contextInfo}

Start by introducing yourself warmly and asking about food allergies and intolerances.`;
}

const EXTRACT_DIET_FORM_PROMPT = `You are a data extraction assistant. Given a conversation between a dietitian and a client, extract all nutrition intake form information mentioned by the USER (not the dietitian) into a structured JSON object.

Return ONLY a valid JSON object with these fields (use empty string "" for any field not mentioned):
{
  "allergies": "",
  "intolerances": "",
  "diet_style": "",
  "foods_love": "",
  "foods_hate": "",
  "medical_dietary_considerations": "",
  "meals_per_day": "",
  "cooking_preferences": ""
}

Rules:
- Only extract what the USER explicitly stated, not assumptions.
- For diet_style, use the closest matching style name from the conversation.
- Combine related pieces of info into single fields where appropriate.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

const MOCK_RESPONSES = {
    intro: `Hello! I'm Dr. Nadia, and I'm excited to be part of your team. Your coach has filled me in on your training goals, and now it's my job to make sure your nutrition is working just as hard as you are. Good nutrition can make the difference between average results and outstanding ones.\n\nLet's start with something important -- do you have any food allergies or intolerances? I'm talking about things like nuts, dairy, gluten, shellfish, soy, eggs, or anything else that causes you problems. Even mild intolerances matter when we're planning daily meals.`,
    followup: [
        `That's really helpful to know. Now, let's talk about your overall dietary approach. Here are some common styles -- pick the one that resonates most with you, or describe your own:\n\n- Keto\n- Vegan\n- Vegetarian\n- Mediterranean\n- Paleo\n- Flexible Dieting / IIFYM\n- Halal\n- Kosher\n- Whole30\n- Carnivore\n- Pescatarian\n- Gluten-Free\n- Dairy-Free\n- Low-FODMAP\n- No Specific Diet\n\nWhich of these best describes how you like to eat, or do you have your own approach?`,
        `Great choice. That tells me a lot about how to structure your meals. Now for the fun part -- what foods do you absolutely love? Think about your favorite meals, ingredients, cuisines, or go-to comfort foods. The more you enjoy your meal plan, the more likely you are to stick with it, and consistency is where the real results come from.`,
        `Good to know what you enjoy. Now the flip side -- are there any foods you really dislike or refuse to eat? There's no point putting something in your plan that you won't touch. Be honest, no judgment here.`,
        `Understood. One more important question -- do you have any medical or dietary considerations I should factor in? Things like diabetes, PCOS, IBS, high cholesterol, blood pressure issues, or any medications that affect your diet?`,
        `Perfect. Last couple of things -- how many meals per day do you prefer? Some people like 3 square meals, others prefer 5-6 smaller ones. And what are your cooking preferences? Do you enjoy cooking, prefer quick and easy meals, like to meal prep on weekends, or want minimal kitchen time?`,
    ],
};

function getMockFollowupResponse(messageCount: number): string {
    const idx = Math.min(Math.floor((messageCount - 1) / 2), MOCK_RESPONSES.followup.length - 1);
    return MOCK_RESPONSES.followup[idx];
}

export async function POST(req: NextRequest) {
    try {
        const { messages, action, previousContext } = await req.json();

        // Handle form data extraction
        if (action === 'extract_form_data') {
            return await handleExtractDietFormData(messages);
        }

        // Handle regular dietitian interview chat
        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Mock response fallback
            const isFirst = messages.length <= 1;
            const mockResponse = isFirst
                ? MOCK_RESPONSES.intro
                : getMockFollowupResponse(messages.length);

            const isLastMock = !isFirst && messages.length >= 12;

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    const words = mockResponse.split(' ');
                    for (const word of words) {
                        controller.enqueue(encoder.encode(word + ' '));
                        await new Promise(r => setTimeout(r, 30));
                    }
                    controller.close();
                },
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    ...(isLastMock ? { 'X-Interview-Complete': 'true' } : {}),
                },
            });
        }

        const systemPrompt = buildDietitianSystemPrompt(previousContext);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
                    parts: [{ text: 'Understood. I will conduct the nutrition intake interview as Dr. Nadia, asking questions one or two at a time about dietary needs.' }],
                },
                ...history,
            ],
        });

        let fullResponse = '';
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
                                // Strip the [INTERVIEW_COMPLETE] marker from streamed output
                                const cleanText = text.replace(/\[INTERVIEW_COMPLETE\]/g, '');
                                if (cleanText) {
                                    controller.enqueue(encoder.encode(cleanText));
                                }
                            }
                        }
                        controller.close();
                    } catch (streamError: unknown) {
                        const sErr = streamError as { status?: number; message?: string };
                        if (sErr?.status === 429 || sErr?.message?.includes('429')) {
                            controller.enqueue(encoder.encode('I\'m currently rate-limited. Please wait a moment and try again.'));
                        } else {
                            controller.enqueue(encoder.encode('Sorry, I encountered an error. Please try again.'));
                        }
                        controller.close();
                    }
                },
            });

            const isComplete = fullResponse.includes('[INTERVIEW_COMPLETE]');

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                    ...(isComplete ? { 'X-Interview-Complete': 'true' } : {}),
                },
            });
        } catch (error: unknown) {
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
        console.error('Dietitian interview error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process dietitian chat';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function handleExtractDietFormData(messages: { role: string; content: string }[]): Promise<Response> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Return empty form data in mock mode
        const emptyForm: DietIntakeFormData = {
            allergies: '', intolerances: '',
            diet_style: '',
            foods_love: '', foods_hate: '',
            medical_dietary_considerations: '',
            meals_per_day: '', cooking_preferences: '',
        };
        return new Response(JSON.stringify(emptyForm), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const conversationText = messages
            .map(m => `${m.role === 'user' ? 'CLIENT' : 'DIETITIAN'}: ${m.content}`)
            .join('\n\n');

        const result = await model.generateContent(
            `${EXTRACT_DIET_FORM_PROMPT}\n\nConversation:\n${conversationText}`
        );

        const responseText = result.response.text().trim();
        // Clean any markdown fences
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const formData = JSON.parse(cleaned) as DietIntakeFormData;
        return new Response(JSON.stringify(formData), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Diet form extraction error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to extract diet form data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
