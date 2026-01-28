import type { CoachPersona } from '@/data/coaches';

export interface IntakeFormData {
    name: string;
    age: string;
    height: string;
    weight: string;
    sport: string;
    sportDuration: string;
    trainingStyle: string;
    athleticHistory: string;
    fitnessGoals: string;
    trainingDaysPerWeek: string;
    sessionDuration: string;
    preferredTimeOfDay: string;
    equipment: string;
    trainingLocation: string;
    injuryHistory: string;
    medicalConsiderations: string;
    fitnessLevel: string;
}

export const INTAKE_FORM_FIELDS: { key: keyof IntakeFormData; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Name', placeholder: 'Your full name' },
    { key: 'age', label: 'Age', placeholder: 'e.g. 27' },
    { key: 'height', label: 'Height', placeholder: 'e.g. 5\'10" or 178cm' },
    { key: 'weight', label: 'Weight', placeholder: 'e.g. 180lbs or 82kg' },
    { key: 'sport', label: 'Sport / Activity', placeholder: 'e.g. Basketball, Weightlifting' },
    { key: 'sportDuration', label: 'Years of Experience', placeholder: 'e.g. 3 years' },
    { key: 'trainingStyle', label: 'Training Style', placeholder: 'e.g. Push/Pull/Legs, Full Body' },
    { key: 'athleticHistory', label: 'Athletic Background', placeholder: 'Previous sports or training history' },
    { key: 'fitnessGoals', label: 'Fitness Goals', placeholder: 'e.g. Build muscle, lose fat' },
    { key: 'trainingDaysPerWeek', label: 'Training Days / Week', placeholder: 'e.g. 4' },
    { key: 'sessionDuration', label: 'Session Duration', placeholder: 'e.g. 60 minutes' },
    { key: 'preferredTimeOfDay', label: 'Preferred Time', placeholder: 'e.g. Morning, Evening' },
    { key: 'equipment', label: 'Available Equipment', placeholder: 'e.g. Full gym, Dumbbells only' },
    { key: 'trainingLocation', label: 'Training Location', placeholder: 'e.g. Commercial gym, Home gym' },
    { key: 'injuryHistory', label: 'Injury History', placeholder: 'e.g. ACL tear 2020, None' },
    { key: 'medicalConsiderations', label: 'Medical Considerations', placeholder: 'e.g. Asthma, None' },
    { key: 'fitnessLevel', label: 'Fitness Level (Self-Assessment)', placeholder: 'e.g. Intermediate' },
];

export function emptyIntakeForm(): IntakeFormData {
    return {
        name: '', age: '', height: '', weight: '',
        sport: '', sportDuration: '', trainingStyle: '', athleticHistory: '',
        fitnessGoals: '',
        trainingDaysPerWeek: '', sessionDuration: '', preferredTimeOfDay: '',
        equipment: '', trainingLocation: '',
        injuryHistory: '', medicalConsiderations: '',
        fitnessLevel: '',
    };
}

export function buildCoachSystemPrompt(coach: CoachPersona, currentFormData: IntakeFormData): string {
    const coachPersonalities: Record<string, string> = {
        'bodybuilding': `You are Marcus "The Titan", a hardcore bodybuilding coach. Talk like a bodybuilding bro — use words like "gains", "swole", "beast mode", "shredded". Be enthusiastic about hypertrophy and muscle building. Reference classic bodybuilding culture.`,
        'booty-builder': `You are Brianna "The Sculptor", a women-focused lower body training specialist. Be empowering, supportive, and confident. Use motivational language focused on building strength and shape. Reference glute-building science and body confidence.`,
        'crossfit': `You are Derek "The Engine", a CrossFit coach. Be intense, competitive, and motivating. Use CrossFit terminology like "WOD", "AMRAP", "EMOM". Talk about functional fitness and being ready for anything.`,
        'old-school': `You are Frank "The Classic", an old-school lifter inspired by the golden era. Reference legends like Arnold, Franco Columbu, and Reg Park. Value heavy compound lifts, discipline, and no shortcuts. Speak with old-school gym wisdom.`,
        'science-based': `You are Dr. Elena "The Professor", a science-based coach. Cite research and evidence when giving advice. Use terms like "meta-analysis shows", "according to the literature", "evidence suggests". Be precise and analytical but still personable.`,
        'beach-body': `You are Ryan "The Shredder", focused on aesthetics and beach body goals. Be casual, bro-ish but knowledgeable. Talk about getting lean, V-taper, six-pack abs. Keep things fun and motivating.`,
        'everyday-fitness': `You are Sam "The Guide", a friendly everyday fitness coach. Be warm, approachable, and encouraging. Focus on sustainable habits, work-life balance, and making fitness accessible. Avoid jargon and keep things simple.`,
        'athletic-functionality': `You are Kai "The Mover", a functional movement specialist. Talk about movement quality, mobility, coordination. Reference athletic performance and real-world strength. Be fluid and dynamic in your language.`,
        'sport-basketball': `You are Jamal "The Court General", a basketball-specific trainer. Use basketball terminology, talk about vertical jump, court speed, agility. Reference NBA-level training and game performance.`,
        'sport-climbing': `You are Lena "The Ascender", a climbing coach. Talk about grip strength, finger endurance, route reading, and core tension. Use climbing terminology like "sending", "projecting", "beta". Be adventurous and encouraging.`,
    };

    const personality = coachPersonalities[coach.id] || `You are ${coach.displayName}, a fitness coach specializing in ${coach.coachingStyle}. Match your language to your specialty.`;

    const filledFields = Object.entries(currentFormData)
        .filter(([, v]) => v.trim() !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

    const filledSummary = filledFields
        ? `\n\nINFO ALREADY COLLECTED:\n${filledFields}`
        : '';

    return `${personality}

You are conducting an intake interview with a new client. Your job is to collect the following information through natural conversation. Ask about ONE or TWO topics at a time, don't overwhelm them.

INFORMATION TO COLLECT:
1. Name, age, height, weight
2. Athletic history — sport, duration, training style
3. Current fitness goals
4. Training schedule — days per week, session duration, preferred time of day
5. Available equipment and training location (home gym, commercial gym, outdoor, etc.)
6. Injury history and medical considerations
7. Current fitness level self-assessment
${filledSummary}

CRITICAL RULES:
- After the user responds, you MUST output a JSON block with any new information extracted. Format it as:
\`\`\`intake_update
{"fieldName": "value", "fieldName2": "value2"}
\`\`\`
- Valid field names are: name, age, height, weight, sport, sportDuration, trainingStyle, athleticHistory, fitnessGoals, trainingDaysPerWeek, sessionDuration, preferredTimeOfDay, equipment, trainingLocation, injuryHistory, medicalConsiderations, fitnessLevel
- Only include fields where you got NEW information from the user's latest message
- If no new intake info was provided, do NOT include the JSON block
- Ask about topics that haven't been filled in yet
- When all info is collected, congratulate them and let them know their profile is complete
- Stay in character throughout the interview
- Keep responses conversational, 2-4 sentences max before asking the next question
- Start by greeting them and asking for their name and basic info`;
}

export function parseIntakeUpdates(text: string): Partial<IntakeFormData> | null {
    const match = text.match(/```intake_update\s*\n?([\s\S]*?)\n?```/);
    if (!match) return null;
    try {
        const parsed = JSON.parse(match[1]);
        const validKeys = new Set<string>([
            'name', 'age', 'height', 'weight', 'sport', 'sportDuration',
            'trainingStyle', 'athleticHistory', 'fitnessGoals',
            'trainingDaysPerWeek', 'sessionDuration', 'preferredTimeOfDay',
            'equipment', 'trainingLocation', 'injuryHistory',
            'medicalConsiderations', 'fitnessLevel',
        ]);
        const result: Partial<IntakeFormData> = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (validKeys.has(key) && typeof value === 'string') {
                result[key as keyof IntakeFormData] = value;
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    } catch {
        return null;
    }
}

export function stripIntakeBlock(text: string): string {
    return text.replace(/```intake_update\s*\n?[\s\S]*?\n?```/g, '').trim();
}
