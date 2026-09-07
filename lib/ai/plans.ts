/**
 * Training plan generation on top of the gateway, shared by
 * api/ai-coach/generate-plan, api/plans/generate and api/onboarding/generate-plans.
 *
 * The model never invents exercises: it gets a candidate list from the `exercises` table
 * (filtered by equipment and level, ~120 rows) and returns ids. The server joins the names,
 * the 4Dcoach id and drops anything it cannot resolve.
 */
import { z } from 'zod';
import { callModel, type CallResult } from './gateway';
import { getAdmin } from '@/lib/auth';
import { HOME_EQUIPMENT, GYM_EQUIPMENT } from '@/lib/exerciseLibrary';
import type { IntakeFormData } from '@/lib/types';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const SetSchema = z.object({
    reps: z.string().describe('e.g. 10, 8-12, AMRAP, 30s'),
    weight: z.string().describe('relative: light, moderate, heavy, BW, RPE 7'),
    rest_seconds: z.number().int().min(0).max(600),
});

export const PlanExerciseSchema = z.object({
    exercise_id: z.string().describe('an id from the candidate list, or "" when none fits'),
    exercise_name: z.string(),
    sets: z.array(SetSchema).min(1).max(8),
    notes: z.string().default(''),
});

export const PlanSessionSchema = z.object({
    name: z.string(),
    description: z.string().default(''),
    day_number: z.number().int().min(1).max(7),
    exercises: z.array(PlanExerciseSchema).min(1).max(10),
});

export const PlanSchema = z.object({
    name: z.string(),
    description: z.string(),
    duration_weeks: z.number().int().min(1).max(16),
    split_type: z.string().default('full_body'),
    periodization_blocks: z.array(z.object({
        phase_type: z.enum(['hypertrophy', 'strength', 'endurance', 'deload', 'power', 'general']),
        phase_duration_weeks: z.number().int().min(1).max(16),
        label: z.string(),
    })).min(1).max(6),
    sessions: z.array(PlanSessionSchema).min(1).max(7),
});

export type GeneratedPlanRaw = z.infer<typeof PlanSchema>;

export interface ResolvedExercise {
    exercise_id: string | null;
    exercise_name: string;
    fourd_id: string | null;
    primary_muscles: string[];
    equipment: string | null;
    sets: z.infer<typeof SetSchema>[];
    notes: string;
}

export interface GeneratedPlan extends Omit<GeneratedPlanRaw, 'sessions'> {
    sessions: Array<Omit<z.infer<typeof PlanSessionSchema>, 'exercises'> & { exercises: ResolvedExercise[] }>;
}

export const SplitsSchema = z.array(z.object({
    id: z.enum(['ppl', 'upper_lower', 'full_body', 'bro_split', 'phul', 'phat']),
    name: z.string(),
    description: z.string(),
    days_per_week: z.number().int().min(1).max(7),
    recommended: z.boolean(),
})).min(2).max(4);

export type SplitOption = z.infer<typeof SplitsSchema>[number];

export const SPLIT_TYPES: Record<string, string> = {
    ppl: 'Push/Pull/Legs (PPL)',
    upper_lower: 'Upper/Lower Split',
    full_body: 'Full Body',
    bro_split: 'Bro Split (body part per day)',
    phul: 'PHUL (Power Hypertrophy Upper Lower)',
    phat: 'PHAT (Power Hypertrophy Adaptive Training)',
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface PlanProfile {
    goals: string;
    experience: string;
    equipment: string;
    location: string;
    trainingDays: number;
    sessionDuration: string;
    injuries: string;
    extra: string;
    splitType: string;
    durationWeeks: number;
    phaseType: string;
}

const DEFAULT_PROFILE: PlanProfile = {
    goals: 'general fitness', experience: 'beginner', equipment: 'full gym', location: 'commercial gym',
    trainingDays: 3, sessionDuration: '60 minutes', injuries: 'none', extra: '', splitType: 'full_body',
    durationWeeks: 8, phaseType: 'auto',
};

function str(v: unknown, fallback = ''): string {
    if (Array.isArray(v)) return v.filter(Boolean).join(', ') || fallback;
    if (v === null || v === undefined || v === '') return fallback;
    return String(v);
}

function days(v: unknown, fallback = 3): number {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n >= 1 && n <= 7 ? n : fallback;
}

/** Profile from the coach-interview intake form plus the last user messages. */
export function profileFromIntake(intake?: Partial<IntakeFormData> | null, messages?: Array<{ role: string; content: string }>, overrides: Partial<PlanProfile> = {}): PlanProfile {
    const userNotes = (messages ?? []).filter((m) => m.role === 'user').slice(-5).map((m) => m.content.slice(0, 300)).join(' | ');
    const parts: string[] = [];
    if (intake?.age) parts.push(`age ${intake.age}`);
    if (intake?.height) parts.push(`height ${intake.height}`);
    if (intake?.weight) parts.push(`weight ${intake.weight}`);
    if (intake?.sport_history) parts.push(`athletic history: ${intake.sport_history}`);
    if (intake?.training_duration) parts.push(`training for ${intake.training_duration}`);
    if (intake?.training_style) parts.push(`style: ${intake.training_style}`);
    if (intake?.preferred_time) parts.push(`prefers ${intake.preferred_time}`);
    if (intake?.medical_considerations) parts.push(`medical: ${intake.medical_considerations}`);
    if (userNotes) parts.push(`from the interview: ${userNotes}`);
    return {
        ...DEFAULT_PROFILE,
        goals: str(intake?.fitness_goals, DEFAULT_PROFILE.goals),
        experience: str(intake?.fitness_level, str(intake?.training_duration, DEFAULT_PROFILE.experience)),
        equipment: str(intake?.available_equipment, DEFAULT_PROFILE.equipment),
        location: str(intake?.training_location, DEFAULT_PROFILE.location),
        trainingDays: days(intake?.training_days_per_week, DEFAULT_PROFILE.trainingDays),
        sessionDuration: str(intake?.session_duration, DEFAULT_PROFILE.sessionDuration),
        injuries: str(intake?.injuries, DEFAULT_PROFILE.injuries),
        extra: parts.join('; '),
        ...overrides,
    };
}

/** Profile from the structured fields the plans/new page sends. */
export function profileFromFields(fields: Record<string, unknown>): PlanProfile {
    return {
        ...DEFAULT_PROFILE,
        goals: str(fields.goals, DEFAULT_PROFILE.goals),
        experience: str(fields.experience_level, DEFAULT_PROFILE.experience),
        equipment: str(fields.available_equipment, DEFAULT_PROFILE.equipment),
        location: str(fields.training_location, /home|body ?weight|no equipment/i.test(str(fields.available_equipment)) ? 'home' : DEFAULT_PROFILE.location),
        trainingDays: days(fields.training_days_per_week, DEFAULT_PROFILE.trainingDays),
        injuries: str(fields.injuries_limitations, DEFAULT_PROFILE.injuries),
        extra: str(fields.preferences),
        splitType: str(fields.split_type, DEFAULT_PROFILE.splitType),
        durationWeeks: days(fields.duration_weeks, 0) || Math.min(16, Math.max(1, parseInt(String(fields.duration_weeks ?? 8), 10) || 8)),
        phaseType: str(fields.phase_type, DEFAULT_PROFILE.phaseType),
    };
}

// ---------------------------------------------------------------------------
// Candidates from the exercise library
// ---------------------------------------------------------------------------

export interface Candidate {
    exercise_id: string;
    name: string;
    primary_muscles: string[];
    equipment: string | null;
    level: string | null;
    mechanic: string | null;
    fourd_id: string | null;
    is_fourd_primary: boolean;
}

let libraryCache: { at: number; rows: Candidate[] } | null = null;

/** The whole library (≈870 rows), cached in memory for ten minutes. */
export async function exerciseLibrary(): Promise<Candidate[]> {
    if (libraryCache && Date.now() - libraryCache.at < 10 * 60_000) return libraryCache.rows;
    const { data, error } = await getAdmin()
        .from('exercises')
        .select('exercise_id, name, primary_muscles, equipment, level, mechanic, fourd_id, is_fourd_primary')
        .in('category', ['strength', 'powerlifting', 'olympic weightlifting', 'strongman', 'plyometrics', 'cardio'])
        .limit(2000);
    if (error) throw new Error(`exercise library: ${error.message}`);
    libraryCache = { at: Date.now(), rows: (data ?? []) as Candidate[] };
    return libraryCache.rows;
}

export function allowedEquipment(profile: PlanProfile): Set<string> {
    const text = `${profile.equipment} ${profile.location}`.toLowerCase();
    const gym = /commercial|full gym|gym|barbell|cable|machine|garage/.test(text) && !/no gym|no equipment|only/.test(text);
    if (gym) return new Set(GYM_EQUIPMENT);
    const allowed = new Set<string>(['body only', 'other']);
    for (const item of HOME_EQUIPMENT) if (text.includes(item.split(' ')[0])) allowed.add(item);
    if (/dumbbell/.test(text)) allowed.add('dumbbell');
    if (/band/.test(text)) allowed.add('bands');
    if (/kettle/.test(text)) allowed.add('kettlebells');
    if (/bench|rack|barbell/.test(text)) { allowed.add('barbell'); allowed.add('e-z curl bar'); }
    if (/pull-?up bar|bar\b/.test(text)) allowed.add('other');
    return allowed;
}

const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 };

/** About 120 candidates: allowed equipment, level not above the user, spread over muscle groups. */
export async function candidateExercises(profile: PlanProfile, perMuscle = 8): Promise<Candidate[]> {
    const rows = await exerciseLibrary();
    const equipment = allowedEquipment(profile);
    const maxLevel = /advanced|expert|10\+|5-10/i.test(profile.experience) ? 2 : /intermediate|3-5|1-3/i.test(profile.experience) ? 1 : 0;
    const eligible = rows.filter((r) => (r.equipment === null || equipment.has(r.equipment)) && (LEVEL_RANK[r.level ?? 'beginner'] ?? 0) <= maxLevel);
    const score = (r: Candidate) => (r.is_fourd_primary ? -3 : r.fourd_id ? -2 : 0) + (r.mechanic === 'compound' ? -1 : 0) + (LEVEL_RANK[r.level ?? 'beginner'] ?? 0) * 0.5;
    const byMuscle = new Map<string, Candidate[]>();
    for (const r of eligible.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))) {
        const m = r.primary_muscles[0] ?? 'other';
        const list = byMuscle.get(m) ?? [];
        if (list.length < perMuscle) { list.push(r); byMuscle.set(m, list); }
    }
    const picked = [...byMuscle.values()].flat();
    // never leave out the 4D-modelled canonical lifts the equipment allows
    for (const r of eligible) if (r.is_fourd_primary && !picked.includes(r)) picked.push(r);
    return picked;
}

function candidateLines(candidates: Candidate[]): string {
    return candidates.map((c) => `${c.exercise_id} | ${c.name} | ${c.primary_muscles.join('/')} | ${c.equipment ?? 'none'}`).join('\n');
}

function normalizeName(s: string): string {
    return s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Attach library rows to what the model returned; unknown ids are resolved by name, else kept as free text. */
export async function resolveExercises(plan: GeneratedPlanRaw): Promise<GeneratedPlan> {
    const rows = await exerciseLibrary();
    const byId = new Map(rows.map((r) => [r.exercise_id, r]));
    const byName = new Map(rows.map((r) => [normalizeName(r.name), r]));
    const find = (id: string, name: string): Candidate | null => {
        if (id && byId.has(id)) return byId.get(id)!;
        const n = normalizeName(name);
        if (byName.has(n)) return byName.get(n)!;
        const words = n.split(' ').filter((w) => w.length > 2);
        let best: Candidate | null = null;
        let bestScore = 0;
        for (const r of rows) {
            const rn = normalizeName(r.name);
            const hits = words.filter((w) => rn.includes(w)).length;
            const s = hits / Math.max(words.length, rn.split(' ').length);
            if (hits >= 2 && s > bestScore) { best = r; bestScore = s; }
        }
        return bestScore >= 0.5 ? best : null;
    };
    return {
        ...plan,
        sessions: plan.sessions.map((s) => ({
            ...s,
            exercises: s.exercises.map((e) => {
                const row = find(e.exercise_id, e.exercise_name);
                return {
                    exercise_id: row?.exercise_id ?? null,
                    exercise_name: row?.name ?? e.exercise_name,
                    fourd_id: row?.fourd_id ?? null,
                    primary_muscles: row?.primary_muscles ?? [],
                    equipment: row?.equipment ?? null,
                    sets: e.sets,
                    notes: e.notes,
                };
            }),
        })),
    };
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

function profileText(p: PlanProfile): string {
    return [
        `Goals: ${p.goals}`,
        `Experience: ${p.experience}`,
        `Equipment: ${p.equipment} (${p.location})`,
        `Training days per week: ${p.trainingDays}`,
        `Session length: ${p.sessionDuration}`,
        `Injuries / limitations: ${p.injuries}`,
        p.extra ? `Other: ${p.extra}` : '',
    ].filter(Boolean).join('\n');
}

const SAFETY = `Respect every injury and limitation: never program an exercise that loads an injured area. Give relative loads (light, moderate, heavy, BW, RPE) since no maxes are known. Never give medical advice.`;

export interface GenerateOptions {
    userId: string;
    tester?: boolean;
    profile: PlanProfile;
}

export async function recommendSplits({ userId, tester, profile }: GenerateOptions): Promise<{ splits: SplitOption[]; cached: boolean; mocked: boolean }> {
    const prompt = `You are an expert strength and conditioning coach. Recommend 3-4 training splits for this client, ranked from most to least suitable. The first one has recommended = true, the rest false. Match days_per_week to the client's ${profile.trainingDays} days. A beginner does not get bro_split or phat; three days means full_body or upper_lower, not ppl.

CLIENT PROFILE:
${profileText(profile)}`;
    const res = await callModel<SplitOption[]>({
        userId, tester, feature: 'plan', prompt, schema: SplitsSchema, maxOutputTokens: 800,
        mock: () => mockSplits(profile.trainingDays),
    });
    return { splits: res.json ?? mockSplits(profile.trainingDays), cached: res.cached, mocked: res.mocked };
}

export async function generateTrainingPlan({ userId, tester, profile }: GenerateOptions): Promise<{ plan: GeneratedPlan; cached: boolean; mocked: boolean; usage: CallResult['usage'] }> {
    const candidates = await candidateExercises(profile);
    const splitName = SPLIT_TYPES[profile.splitType] ?? profile.splitType;
    const weeks = profile.durationWeeks || 8;
    const prompt = `You are an expert strength and conditioning coach. Build a ${weeks}-week periodized training plan.

CLIENT PROFILE:
${profileText(profile)}

SPLIT: ${splitName}
PHASE PREFERENCE: ${profile.phaseType}

RULES:
- Exactly ${profile.trainingDays} sessions, day_number 1..${profile.trainingDays}, one weekly cycle.
- 4-7 exercises per session, 2-5 sets each, rest_seconds 45-180.
- Pick exercises ONLY from the candidate list below and copy the id into exercise_id (and the name into exercise_name). If nothing on the list fits a slot, set exercise_id to "" and name the exercise plainly.
- Prefer the big compound lifts (bench press, squat, deadlift, pull-up, push-up, hip thrust) where they suit the goal: the app can coach their form in 4D.
- periodization_blocks sum to ${weeks} weeks and end with a deload when the plan is 6+ weeks.
- notes: one sentence of form cues per exercise. No emojis.
- ${SAFETY}

CANDIDATES (id | name | muscles | equipment):
${candidateLines(candidates)}`;

    const res = await callModel<GeneratedPlanRaw>({
        userId, tester, feature: 'plan', prompt, schema: PlanSchema,
        mock: () => mockPlan(profile, candidates),
    });
    const raw = res.json ?? mockPlan(profile, candidates);
    const plan = await resolveExercises(raw);
    return { plan, cached: res.cached, mocked: res.mocked, usage: res.usage };
}

// ---------------------------------------------------------------------------
// Mocks (no key outside production, AI_MOCK=1, CI)
// ---------------------------------------------------------------------------

export function mockSplits(trainingDays: number): SplitOption[] {
    if (trainingDays <= 3) {
        return [
            { id: 'full_body', name: 'Full Body', description: 'Every muscle group each session: the most frequency for your schedule.', days_per_week: trainingDays, recommended: true },
            { id: 'upper_lower', name: 'Upper/Lower Split', description: 'Alternate upper and lower days for balanced development.', days_per_week: trainingDays, recommended: false },
            { id: 'ppl', name: 'Push/Pull/Legs', description: 'Push, pull and leg days; better with more training days.', days_per_week: trainingDays, recommended: false },
        ];
    }
    if (trainingDays <= 4) {
        return [
            { id: 'upper_lower', name: 'Upper/Lower Split', description: 'Two upper and two lower sessions a week.', days_per_week: trainingDays, recommended: true },
            { id: 'ppl', name: 'Push/Pull/Legs', description: 'Focused muscle-group days.', days_per_week: trainingDays, recommended: false },
            { id: 'full_body', name: 'Full Body', description: 'High frequency, every muscle more often.', days_per_week: trainingDays, recommended: false },
        ];
    }
    return [
        { id: 'ppl', name: 'Push/Pull/Legs', description: 'Run the cycle twice a week for full volume.', days_per_week: trainingDays, recommended: true },
        { id: 'upper_lower', name: 'Upper/Lower Split', description: 'A proven split with a clear upper/lower division.', days_per_week: trainingDays, recommended: false },
        { id: 'bro_split', name: 'Bro Split', description: 'One body part per day for maximum volume per muscle.', days_per_week: trainingDays, recommended: false },
    ];
}

export function mockPlan(profile: PlanProfile, candidates: Candidate[] = []): GeneratedPlanRaw {
    const pick = (fourd: string, fallbackName: string): { exercise_id: string; exercise_name: string } => {
        const c = candidates.find((x) => x.fourd_id === fourd && x.is_fourd_primary) ?? candidates.find((x) => x.fourd_id === fourd);
        return c ? { exercise_id: c.exercise_id, exercise_name: c.name } : { exercise_id: '', exercise_name: fallbackName };
    };
    const sets = (reps: string, n = 3, rest = 90) => Array.from({ length: n }, () => ({ reps, weight: 'moderate', rest_seconds: rest }));
    const names: Record<string, string[]> = {
        ppl: ['Push Day', 'Pull Day', 'Legs Day'],
        upper_lower: ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'],
        full_body: ['Full Body A', 'Full Body B', 'Full Body C'],
        bro_split: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
    };
    const sessionNames = names[profile.splitType] ?? names.full_body;
    const exercises = [
        { ...pick('squat', 'Barbell Squat'), sets: sets('8-10', 3, 120), notes: 'Chest up, drive through the heels, full depth.' },
        { ...pick('bench', 'Barbell Bench Press'), sets: sets('8-10', 3, 120), notes: 'Control the descent, feet planted, press through the chest.' },
        { ...pick('deadlift', 'Barbell Deadlift'), sets: sets('5', 3, 150), notes: 'Flat back, bar close, hinge at the hips.' },
        { ...pick('pullup', 'Pull-up'), sets: sets('6-8', 3, 90), notes: 'Full hang at the bottom, chin over the bar.' },
        { ...pick('hip-thrust', 'Barbell Hip Thrust'), sets: sets('10-12', 3, 90), notes: 'Chin tucked, squeeze the glutes at the top.' },
        { ...pick('plank', 'Plank'), sets: sets('45s', 3, 60), notes: 'Ribs down, glutes tight, straight line from head to heels.' },
    ];
    const weeks = profile.durationWeeks || 8;
    return {
        name: `${SPLIT_TYPES[profile.splitType] ?? 'Custom'} Program`,
        description: 'A starter program built around the big lifts with progressive overload. Add a little weight or a rep each week.',
        duration_weeks: weeks,
        split_type: profile.splitType,
        periodization_blocks: weeks >= 6
            ? [{ phase_type: 'hypertrophy', phase_duration_weeks: weeks - 3, label: 'Hypertrophy' }, { phase_type: 'strength', phase_duration_weeks: 2, label: 'Strength' }, { phase_type: 'deload', phase_duration_weeks: 1, label: 'Deload' }]
            : [{ phase_type: 'general', phase_duration_weeks: weeks, label: 'General' }],
        sessions: Array.from({ length: profile.trainingDays }, (_, d) => ({
            name: sessionNames[d % sessionNames.length],
            description: '',
            day_number: d + 1,
            exercises: exercises.slice(d % 2, d % 2 + 5),
        })),
    };
}
