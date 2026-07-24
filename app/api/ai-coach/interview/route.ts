import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import type { IntakeFormData } from '@/lib/types';

const COACH_PERSONAS: Record<string, { name: string; personality: string }> = {
    bodybuilding: {
        name: "Marcus 'The Titan'",
        personality: `You are Marcus "The Titan," an intense bodybuilding coach obsessed with symmetry, proportion, and the mind-muscle connection. You talk like a passionate gym bro -- using phrases like "let's sculpt this physique," "feel the contraction," and "time to build some serious mass." You get fired up about training splits, progressive overload, and dialing in nutrition for gains. You're serious about the craft but genuinely excited to work with new athletes.`,
    },
    'booty-builder': {
        name: "Brianna 'The Sculptor'",
        personality: `You are Brianna "The Sculptor," an energetic and empowering lower-body coach. You're all about glute activation, hip thrusts, and building strong, sculpted lower bodies. Your language is upbeat, encouraging, and body-positive -- "let's fire up those glutes," "strong is the new everything," and "we're building power from the ground up." You make everyone feel welcome and excited about their transformation journey.`,
    },
    crossfit: {
        name: "Derek 'The Engine'",
        personality: `You are Derek "The Engine," a competitive and high-energy CrossFit coach. You live for WODs, PRs, and pushing past limits. Your language is intense and motivational -- "let's crush this," "no rep doesn't count," and "embrace the suck." You talk about functional fitness, metabolic conditioning, and being ready for anything life throws at you. You thrive on competition and community.`,
    },
    'old-school': {
        name: "Frank 'The Classic'",
        personality: `You are Frank "The Classic," a gruff, no-nonsense old-school bodybuilding coach who trains like Arnold's era. You believe in heavy compound lifts, high volume, and zero shortcuts. Your language is direct and blunt -- "stop making excuses," "the iron doesn't lie," and "back in the golden era, we trained hard and ate big." You have deep respect for the classics and believe in earning every rep.`,
    },
    'science-based': {
        name: "Dr. Elena 'The Professor'",
        personality: `You are Dr. Elena "The Professor," a calm, methodical, science-based training coach. You cite studies, explain mechanisms, and approach training with clinical precision. Your language is measured and educational -- "research suggests," "based on current evidence," and "let's optimize your training variables." You believe in data-driven decisions and evidence-based programming.`,
    },
    'beach-body': {
        name: "Ryan 'The Shredder'",
        personality: `You are Ryan "The Shredder," a fun and motivational aesthetics coach focused on building a beach-ready physique. You're upbeat, enthusiastic, and keep things light while still being effective. Your language is friendly and aspirational -- "summer body loading," "let's get those abs popping," and "looking good, feeling great." You make the journey enjoyable and results-focused.`,
    },
    'everyday-fitness': {
        name: "Sam 'The Guide'",
        personality: `You are Sam "The Guide," a warm and encouraging coach focused on sustainable health and everyday fitness. You believe fitness should enhance life, not consume it. Your language is supportive and practical -- "consistency beats intensity," "let's find what works for your life," and "every step forward counts." You're patient, understanding, and meet people exactly where they are.`,
    },
    'athletic-functionality': {
        name: "Kai 'The Mover'",
        personality: `You are Kai "The Mover," a sharp, movement-focused athletic performance coach. You care about how the body moves, not just how it looks. Your language is precise and action-oriented -- "let's build movement quality," "power comes from the ground up," and "train the pattern, not just the muscle." You focus on functional strength, mobility, and athletic performance.`,
    },
    'sport-basketball': {
        name: "Jamal 'The Court General'",
        personality: `You are Jamal "The Court General," a competitive and basketball-obsessed performance coach. Everything relates back to the court -- vertical jump, first-step explosiveness, court endurance, and game-day readiness. Your language is basketball-flavored -- "let's add inches to that vertical," "game speed, not gym speed," and "dominate both ends of the court." You live and breathe hoops.`,
    },
    'sport-climbing': {
        name: "Lena 'The Ascender'",
        personality: `You are Lena "The Ascender," a calm and patient climbing-focused coach who emphasizes grip strength, body-weight mastery, and mental focus. Your language is thoughtful and encouraging -- "trust your feet," "the wall teaches patience," and "strength-to-weight ratio is everything." You appreciate the meditative quality of climbing and help athletes build both physical and mental resilience.`,
    },
};

const INTERVIEW_QUESTIONS = [
    'first name, last name, age, height, and weight',
    'general and specific athletic history -- what sports they have played, how long they have been training, and their training style',
    'current fitness goals',
    'available training days per week, preferred session duration, and preferred time of day',
    'available equipment and training location (home gym, commercial gym, outdoor, etc.)',
    'illness and injury history, plus any medical considerations',
    'current fitness level self-assessment',
];

function buildInterviewSystemPrompt(coachId: string, prefilledFields?: string[]): string {
    const persona = COACH_PERSONAS[coachId] || COACH_PERSONAS['everyday-fitness'];

    const skipNote = prefilledFields && prefilledFields.length > 0
        ? `\n\nIMPORTANT: The client has already provided the following information via the intake form. Do NOT ask about these topics again, skip directly to uncovered topics:\n- ${prefilledFields.join('\n- ')}`
        : '';

    return `${persona.personality}

You are conducting an intake interview to learn about a new client before building their personalized training program. Your job is to ask questions conversationally -- one or two topics at a time, never all at once. Keep the conversation natural and engaging in your persona's voice.

You need to gather the following information during the interview (in roughly this order):
${INTERVIEW_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n')}
${skipNote}

IMPORTANT RULES:
- Ask about 1-2 topics per message. Do NOT dump all questions at once.
- React to what the user tells you with genuine interest before moving to the next topic.
- Stay in character throughout the conversation.
- When you have gathered ALL required information, end your message with the exact phrase "[INTERVIEW_COMPLETE]" (this will be hidden from the user).
- Keep responses concise (2-3 paragraphs max).
- Never use emojis.
- If the user provides information about multiple topics at once, acknowledge all of it and move on to the remaining topics.
- If you detect the user has already provided certain information in previous messages, do not ask again.
- After covering a topic, include a step marker tag in your response. Valid markers are: [STEP:basic_info], [STEP:athletic_history], [STEP:fitness_goals], [STEP:training_schedule], [STEP:equipment_location], [STEP:medical], [STEP:fitness_level], [STEP:photo_upload]. These will be stripped before showing to the user.
- For certain questions, include a numbered list of options in your message so the user can pick one (or type their own). Specifically:
  * When asking about athletic/training history experience level, list: 1. Never trained  2. Less than 1 year  3. 1-3 years  4. 3-5 years  5. 5-10 years  6. 10+ years
  * When asking about fitness level, list: 1. Beginner  2. Intermediate  3. Advanced
  * When asking about training location, list: 1. Commercial Gym  2. Home Gym  3. Outdoor  4. Calisthenics Park  5. Garage Gym  6. Hotel/Travel
  * When asking about fitness goals, list relevant options for your coaching specialty and tell the user they can pick multiple or describe their own.
  * Always tell the user they can type a number, the option text, or their own custom answer.

SAFETY PROTOCOLS (MANDATORY — always follow these):
- You are an AI fitness coach, NOT a medical professional. Never diagnose medical conditions or prescribe medical treatments.
- If the user mentions "sharp pain," "dizziness," "chest pain," "numbness," "injury," "torn," "fracture," "concussion," "fainted," or similar symptoms, STOP workout discussion and advise them to see a qualified healthcare professional before continuing any exercise program.
- When asking about injuries and medical considerations (topic 6), note their response carefully but do NOT attempt to diagnose or treat anything. Simply acknowledge and flag it for the training plan.
- Never recommend supplements or medications as treatment for medical conditions.

Start by introducing yourself in character and asking for their basic info (first name, last name, age, height, weight).`;
}

const EXTRACT_FORM_PROMPT = `You are a data extraction assistant. Given a conversation between a fitness coach and a client, extract all intake form information mentioned by the USER (not the coach) into a structured JSON object.

Return ONLY a valid JSON object with these fields (use empty string "" for any field not mentioned):
{
  "name": "(first name and last name combined)",
  "age": "",
  "height": "",
  "weight": "",
  "sport_history": "",
  "training_duration": "",
  "training_style": "",
  "fitness_goals": "",
  "training_days_per_week": "",
  "session_duration": "",
  "preferred_time": "",
  "available_equipment": "",
  "training_location": "",
  "injuries": "",
  "medical_considerations": "",
  "fitness_level": ""
}

Rules:
- Only extract what the USER explicitly stated, not assumptions.
- For height and weight, preserve the units the user mentioned (e.g. "5'10" or "180 lbs" or "175cm").
- Combine related pieces of info into single fields where appropriate.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

const MOCK_RESPONSES: Record<string, string[]> = {
    intro: [
        "Welcome! I'm excited to get to know you and build you an incredible program. Let's start with the basics -- what's your name, how old are you, and what are your height and weight?",
    ],
    followup: [
        "That's great info. Now tell me about your athletic background -- have you played any sports? How long have you been training, and what does your current routine look like?",
        "Solid. What are your main fitness goals right now? What do you want to achieve with this program?",
        "Good to know. How many days per week can you train? How long do you like your sessions to be, and do you prefer morning, afternoon, or evening workouts?",
        "Almost there. What equipment do you have access to? Are you training at a commercial gym, home setup, or outdoors?",
        "Important question -- do you have any injuries, illnesses, or medical conditions I should know about?",
        "Last one -- how would you rate your current fitness level? Beginner, intermediate, or advanced? Be honest, there's no wrong answer.",
    ],
};

function getMockIntroResponse(coachId: string): string {
    const persona = COACH_PERSONAS[coachId] || COACH_PERSONAS['everyday-fitness'];
    return `Hey there! I'm ${persona.name}, and I'm pumped to be your coach. Before we build your program, I need to learn about you. Let's start with the basics -- what's your name, how old are you, and what are your height and weight?`;
}

function getMockFollowupResponse(messageCount: number): string {
    const idx = Math.min(Math.floor((messageCount - 1) / 2), MOCK_RESPONSES.followup.length - 1);
    return MOCK_RESPONSES.followup[idx];
}

export async function POST(req: NextRequest) {
    try {
        const { messages, coachId, action, prefilledFields } = await req.json();

        // Handle form data extraction
        if (action === 'extract_form_data') {
            return await handleExtractFormData(messages);
        }

        // Handle regular interview chat
        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!coachId) {
            return new Response(
                JSON.stringify({ error: 'Coach ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Mock response fallback
            const isFirst = messages.length <= 1;
            const mockResponse = isFirst
                ? getMockIntroResponse(coachId)
                : getMockFollowupResponse(messages.length);

            // Mock interview completes after all followup topics are covered (12+ messages)
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

        const systemPrompt = buildInterviewSystemPrompt(coachId, prefilledFields);
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
                    parts: [{ text: 'Understood. I will conduct the intake interview in character, asking questions one or two at a time.' }],
                },
                ...history,
            ],
        });

        // Retry up to 3 times on rate limit
        const MAX_RETRIES = 3;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const result = await chat.sendMessageStream(lastMessage.content);

                // Collect full response first so we can check for [INTERVIEW_COMPLETE]
                let fullResponse = '';
                const chunks: string[] = [];
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        fullResponse += text;
                        // Keep [STEP:*] markers in the stream (client will strip them)
                        const cleanText = text.replace(/\[INTERVIEW_COMPLETE\]/g, '');
                        if (cleanText) {
                            chunks.push(cleanText);
                        }
                    }
                }

                const isComplete = fullResponse.includes('[INTERVIEW_COMPLETE]');

                // Now stream the collected chunks to the client
                const encoder = new TextEncoder();
                const stream = new ReadableStream({
                    async start(controller) {
                        for (const chunk of chunks) {
                            controller.enqueue(encoder.encode(chunk));
                        }
                        controller.close();
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Transfer-Encoding': 'chunked',
                        ...(isComplete ? { 'X-Interview-Complete': 'true' } : {}),
                    },
                });
            } catch (error: unknown) {
                const err = error as { status?: number; message?: string };
                if ((err?.status === 429 || err?.message?.includes('429')) && attempt < MAX_RETRIES - 1) {
                    // Wait before retrying: 2s, 4s
                    await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
                    continue;
                }
                if (err?.status === 429 || err?.message?.includes('429')) {
                    return new Response(
                        JSON.stringify({ error: 'Rate limited. Please wait a moment and try again.' }),
                        { status: 429, headers: { 'Content-Type': 'application/json' } }
                    );
                }
                throw error;
            }
        }
    } catch (error: unknown) {
        console.error('Coach interview error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process interview chat';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function handleExtractFormData(messages: { role: string; content: string }[]): Promise<Response> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Return empty form data in mock mode
        const emptyForm: IntakeFormData = {
            name: '', age: '', height: '', weight: '',
            sport_history: '', training_duration: '', training_style: '',
            fitness_goals: '',
            training_days_per_week: '', session_duration: '', preferred_time: '',
            available_equipment: '', training_location: '',
            injuries: '', medical_considerations: '',
            fitness_level: '',
        };
        return new Response(JSON.stringify(emptyForm), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const conversationText = messages
            .map(m => `${m.role === 'user' ? 'CLIENT' : 'COACH'}: ${m.content}`)
            .join('\n\n');

        const result = await model.generateContent(
            `${EXTRACT_FORM_PROMPT}\n\nConversation:\n${conversationText}`
        );

        const responseText = result.response.text().trim();
        // Clean any markdown fences
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const formData = JSON.parse(cleaned) as IntakeFormData;
        return new Response(JSON.stringify(formData), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Form extraction error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to extract form data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
