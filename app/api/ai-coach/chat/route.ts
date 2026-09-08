/**
 * POST /api/ai-coach/chat { messages, chatId? } → streamed text/plain, header X-Chat-Id
 *
 * The caller comes from the token (never from the body). Context: profile, active plan, the last
 * three workouts and the macro targets, trimmed. Gated by the gateway: flash-lite, 600 output
 * tokens, the last 12 turns, 40 calls a day, the monthly budget.
 */
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { streamModel, limitResponse, type ChatMessage } from '@/lib/ai/gateway';
import { macroTargets, inputsFromProfile } from '@/lib/ai/nutrition';
import type { AIChatMessage, Profile } from '@/lib/types';

const MOCK_RESPONSES = [
    "Happy to help with your training. Based on your profile I'd focus on progressive overload on the big compound lifts: add the smallest increment or one rep each week.",
    'Recovery is where the progress happens: seven to nine hours of sleep, enough protein spread over the day, and water. Then train hard again.',
    'Looking at your recent sessions you are consistent, which matters most. A deload every four to six weeks keeps you coming back stronger.',
];

/** Trimmed context: profile, active plan with session names, last three workouts, macro targets. */
async function buildUserContext(supabase: SupabaseClient, userId: string): Promise<string> {
    const parts: string[] = [];
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: profile }, { data: assignment }, { data: logs }] = await Promise.all([
            supabase.from('profiles').select('full_name, username, fitness_goals, height_cm, weight_kg, gender, date_of_birth, preferred_weight_unit').eq('id', userId).maybeSingle(),
            supabase.from('training_plan_assignments')
                .select('plan_id, start_date, end_date, training_plans(name, description, duration_weeks, phase_type)')
                .eq('user_id', userId).eq('is_active', true).lte('start_date', today).gte('end_date', today)
                .order('start_date', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('workout_logs').select('date, total_duration_seconds, notes, exercise_logs(exercise_id, total_sets, total_reps, max_weight)')
                .eq('user_id', userId).not('completed_at', 'is', null).order('date', { ascending: false }).limit(3),
        ]);

        if (profile) {
            parts.push(`User: ${profile.full_name || profile.username || 'the user'}`);
            if (profile.fitness_goals?.length) parts.push(`Goals: ${profile.fitness_goals.join(', ')}`);
            if (profile.height_cm) parts.push(`Height: ${profile.height_cm} cm`);
            if (profile.weight_kg) parts.push(`Weight: ${profile.weight_kg} kg`);
            if (profile.preferred_weight_unit) parts.push(`Weight unit: ${profile.preferred_weight_unit}`);
            const t = macroTargets(inputsFromProfile(profile as Partial<Profile>));
            parts.push(`Macro targets: ${t.daily_calories} kcal, P ${t.protein_g} g, C ${t.carbs_g} g, F ${t.fat_g} g`);
        }
        const plan = assignment?.training_plans as { name?: string; description?: string; duration_weeks?: number; phase_type?: string } | { name?: string }[] | null | undefined;
        const p = Array.isArray(plan) ? plan[0] : plan;
        if (p?.name) {
            parts.push(`Active plan: "${p.name}"${'phase_type' in p && p.phase_type ? ` (${p.phase_type})` : ''}, ${assignment?.start_date} to ${assignment?.end_date}`);
            const { data: sessions } = await supabase.from('training_plan_sessions').select('day_number, workout_sessions(name)').eq('plan_id', assignment!.plan_id).order('day_number').limit(7);
            if (sessions?.length) {
                parts.push(`Sessions: ${sessions.map((s) => { const ws = s.workout_sessions as { name?: string } | { name?: string }[] | null; const w = Array.isArray(ws) ? ws[0] : ws; return `day ${s.day_number} ${w?.name ?? ''}`; }).join('; ')}`);
            }
        }
        if (logs?.length) {
            parts.push(`Last workouts:`);
            for (const log of logs) {
                const ex = (log.exercise_logs as Array<{ exercise_id: string; total_sets: number | null; total_reps: number | null; max_weight: number | null }> | null ?? []).slice(0, 6)
                    .map((e) => `${e.exercise_id.replace(/_/g, ' ')} ${e.total_sets ?? '?'}x${e.total_reps ?? '?'}${e.max_weight ? ` @${e.max_weight}` : ''}`).join(', ');
                parts.push(`- ${log.date}${log.total_duration_seconds ? ` ${Math.round(log.total_duration_seconds / 60)} min` : ''}: ${ex || 'no sets logged'}${log.notes ? ` (notes: ${String(log.notes).slice(0, 80)})` : ''}`);
            }
        }
    } catch (err) {
        console.error('[ai-coach/chat] context', userId, err instanceof Error ? err.message : err);
    }
    return parts.length ? `\n\nCurrent user context:\n${parts.join('\n')}` : '';
}

function systemPrompt(userContext: string): string {
    return `You are SHaiPT AI Coach, an expert fitness coach and personal trainer. You have deep knowledge of exercise science, nutrition, and training programming.${userContext}

Your personality:
- Encouraging but honest — give real advice, not just hype
- Concise and actionable — keep responses focused
- Safety-first — always prioritize proper form and injury prevention
- Data-aware — reference the user's goals, recent workouts, and plan when relevant

You help with:
- Training plan adjustments and exercise recommendations
- Form and technique guidance (the app's 4Dcoach can film a set and check the form in 4D: mention it when form comes up)
- Nutrition and recovery advice
- Progress analysis and goal setting
- Motivation and accountability

SAFETY PROTOCOLS (MANDATORY — always follow these):
1. You are an AI fitness assistant, NOT a medical professional. Never diagnose medical conditions or prescribe medical treatments.
2. If the user mentions "sharp pain," "dizziness," "chest pain," "numbness," "tingling," "injury," "torn," "fracture," "concussion," "fainted," "blacked out," or similar symptoms, you MUST:
   - Immediately stop all workout or training advice for that area/situation.
   - Advise them to consult a qualified healthcare professional or doctor before continuing exercise.
   - Do NOT attempt to diagnose or treat the issue.
3. Never recommend supplements or medications as treatment for medical conditions.
4. For any nutrition guidance, clarify that you are providing general fitness nutrition information, not medical dietary advice. Recommend consulting a registered dietitian or doctor for medical dietary needs.
5. Always end health-related responses with: "Remember: I'm an AI coach, not a medical professional. Always consult your doctor for health concerns."

Keep responses concise (2-4 paragraphs max). Use markdown formatting when listing exercises or plans. Never use emojis.`;
}

async function saveChatHistory(supabase: SupabaseClient, userId: string, chatId: string | undefined, messages: AIChatMessage[], firstMessageContent?: string): Promise<string | undefined> {
    try {
        if (chatId) {
            const { error } = await supabase.from('ai_chats').update({ messages }).eq('id', chatId).eq('user_id', userId);
            if (error) throw error;
            return chatId;
        }
        const { data, error } = await supabase.from('ai_chats')
            .insert({ user_id: userId, title: firstMessageContent?.substring(0, 100) || 'AI Coach Chat', messages })
            .select('id').single();
        if (error) throw error;
        return data.id as string;
    } catch (err) {
        console.error('[ai-coach/chat] history', userId, err instanceof Error ? err.message : err);
        return undefined;
    }
}

/** GET /api/ai-coach/chat → { chatId, messages } of the most recent conversation, or nulls. */
export async function GET(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { user, supabase } = auth;

    const { data, error } = await supabase.from('ai_chats')
        .select('id, messages').eq('user_id', user.id)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) {
        console.error('[ai-coach/chat] load', user.id, error.message);
        return NextResponse.json({ chatId: null, messages: [] });
    }
    const messages = (Array.isArray(data?.messages) ? data.messages : []) as AIChatMessage[];
    return NextResponse.json({ chatId: data?.id ?? null, messages });
}

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { user, supabase } = auth;

    try {
        const { messages, chatId, isPrivate } = await req.json() as { messages?: ChatMessage[]; chatId?: string; isPrivate?: boolean };
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
        }
        const history = messages
            .filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 4000) }));

        const [{ tester }, userContext] = await Promise.all([getProfileBits(auth), buildUserContext(supabase, user.id)]);
        const { stream, done } = await streamModel({
            userId: user.id, tester, feature: 'chat', system: systemPrompt(userContext), messages: history,
            mock: () => MOCK_RESPONSES[history.length % MOCK_RESPONSES.length],
        });

        // persist when the model is done; the client gets the chat id in the header, so create the
        // row up front when this is a new conversation. Private mode writes nothing at all: the
        // toggle in the UI has to mean what it says.
        let savedChatId = chatId;
        if (!isPrivate) {
            if (!savedChatId) {
                savedChatId = await saveChatHistory(supabase, user.id, undefined,
                    history.map((m) => ({ ...m, timestamp: new Date().toISOString() })), history[0]?.content);
            }
            done.then(({ text }) => {
                const all: AIChatMessage[] = [
                    ...history.map((m) => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() })),
                    { role: 'assistant', content: text, timestamp: new Date().toISOString() },
                ];
                return saveChatHistory(supabase, user.id, savedChatId, all, history[0]?.content);
            }).catch(() => undefined);
        } else {
            savedChatId = undefined;
            done.catch(() => undefined);
        }

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
                ...(savedChatId ? { 'X-Chat-Id': savedChatId } : {}),
            },
        });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/chat]', user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to process chat';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
