/**
 * POST /api/ai-coach/dietitian-interview
 *   { messages, previousContext? } → text/plain reply, header X-Interview-Complete
 *   { action: 'extract_form_data', messages } → DietIntakeFormData JSON
 * Gated: flash-lite, 600 tokens, 12 turns.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse, type ChatMessage } from '@/lib/ai/gateway';
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

SAFETY PROTOCOLS (MANDATORY — always follow these):
- You are an AI nutrition assistant, NOT a licensed medical doctor or registered dietitian. Always make this clear when giving nutrition advice.
- Never diagnose medical conditions (diabetes, PCOS, IBS, etc.) or prescribe medical dietary treatments. If the user reports a medical condition, acknowledge it and strongly recommend they consult their doctor or a licensed registered dietitian for condition-specific dietary management.
- If the user mentions "sharp pain," "dizziness," "fainting," "severe nausea," "vomiting," "allergic reaction," or similar acute symptoms, STOP nutrition discussion and advise them to seek immediate medical attention.
- Never recommend calorie intake below 1200 kcal/day without explicitly warning the user that very low-calorie diets require medical supervision. If their goals suggest sub-1200 intake, flag this clearly and recommend professional guidance.
- Always append to your final interview summary: "Note: I am an AI nutrition assistant, not a licensed medical professional. This guidance is for general informational purposes. Consult a healthcare provider for medical dietary needs."
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

const DietSchema = z.object({
    allergies: z.string().default(''), intolerances: z.string().default(''), diet_style: z.string().default(''),
    foods_love: z.string().default(''), foods_hate: z.string().default(''), medical_dietary_considerations: z.string().default(''),
    meals_per_day: z.string().default(''), cooking_preferences: z.string().default(''),
});

const EMPTY_FORM: DietIntakeFormData = {
    allergies: '', intolerances: '', diet_style: '', foods_love: '', foods_hate: '',
    medical_dietary_considerations: '', meals_per_day: '', cooking_preferences: '',
};

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { messages, action, previousContext } = await req.json() as {
            messages?: ChatMessage[]; action?: string; previousContext?: Array<{ role: string; content: string }>;
        };
        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }
        const { tester } = await getProfileBits(auth);
        const history = messages.filter((m) => m && typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));

        if (action === 'extract_form_data') {
            const conversationText = history.map((m) => `${m.role === 'user' ? 'CLIENT' : 'DIETITIAN'}: ${m.content}`).join('\n\n');
            const res = await callModel<DietIntakeFormData>({
                userId: auth.user.id, tester, feature: 'dietitian_interview', schema: DietSchema, maxOutputTokens: 400, temperature: 0.1,
                prompt: `${EXTRACT_DIET_FORM_PROMPT}\n\nConversation:\n${conversationText}`,
                mock: () => EMPTY_FORM,
            });
            return NextResponse.json(res.json ?? EMPTY_FORM);
        }

        const isFirst = history.length <= 1;
        const res = await callModel({
            userId: auth.user.id, tester, feature: 'dietitian_interview',
            system: buildDietitianSystemPrompt(previousContext),
            messages: history.length ? history : [{ role: 'user', content: 'Hello' }],
            mock: () => (isFirst ? MOCK_RESPONSES.intro : getMockFollowupResponse(history.length)) + (history.length >= 12 ? ' [INTERVIEW_COMPLETE]' : ''),
        });
        const isComplete = res.text.includes('[INTERVIEW_COMPLETE]');
        const clean = res.text.replace(/\[INTERVIEW_COMPLETE\]/g, '').trim();
        return new Response(clean, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
                ...(isComplete ? { 'X-Interview-Complete': 'true' } : {}),
            },
        });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/dietitian-interview]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to process dietitian chat';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
