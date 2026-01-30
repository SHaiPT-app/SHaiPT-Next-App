// Shared base goals available to all coaches
const BASE_GOALS = [
    'Build Muscle',
    'Lose Fat',
    'Improve Strength',
    'Increase Endurance',
    'Improve Flexibility & Mobility',
    'General Health & Wellness',
];

// Coach-specific additional goals
const COACH_GOALS: Record<string, string[]> = {
    bodybuilding: [
        'Maximize Hypertrophy',
        'Improve Symmetry & Proportion',
        'Contest Prep',
        'Increase Training Volume',
        'Mind-Muscle Connection',
    ],
    'booty-builder': [
        'Grow Glutes',
        'Shape Lower Body',
        'Build Hip Strength',
        'Improve Posture',
        'Increase Confidence',
    ],
    crossfit: [
        'Improve WOD Performance',
        'Master Olympic Lifts',
        'Build Metabolic Conditioning',
        'Improve Gymnastics Skills',
        'Competition Prep',
    ],
    'old-school': [
        'Build Classic Physique',
        'Increase Compound Lift Numbers',
        'Old-School Mass Building',
        'Improve Posing',
        'Build Functional Strength',
    ],
    'science-based': [
        'Optimize Training Variables',
        'Evidence-Based Periodization',
        'Track Progressive Overload',
        'Improve Recovery',
        'Body Recomposition',
    ],
    'beach-body': [
        'Get Six-Pack Abs',
        'Build V-Taper',
        'Shred Body Fat',
        'Look Good At The Beach',
        'Build Defined Arms',
    ],
    'everyday-fitness': [
        'Build Sustainable Habits',
        'Reduce Stress',
        'Improve Sleep Quality',
        'Functional Daily Fitness',
        'Work-Life Balance',
    ],
    'athletic-functionality': [
        'Improve Movement Quality',
        'Build Functional Power',
        'Enhance Coordination',
        'Prevent Injuries',
        'Sport-Specific Performance',
    ],
    'sport-basketball': [
        'Increase Vertical Jump',
        'Improve Court Speed',
        'Build Game Endurance',
        'Enhance Agility',
        'First-Step Explosiveness',
    ],
    'sport-climbing': [
        'Improve Grip Strength',
        'Build Finger Endurance',
        'Increase Core Tension',
        'Improve Strength-to-Weight Ratio',
        'Send Harder Routes',
    ],
};

/** Get all fitness goals for a coach, with coach-specific goals first */
export function getGoalsForCoach(coachId: string): string[] {
    const coachSpecific = COACH_GOALS[coachId] || [];
    return [...coachSpecific, ...BASE_GOALS];
}
