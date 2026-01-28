export interface CoachPersona {
    id: string;
    fullName: string;
    nickname: string;
    displayName: string;
    avatarUrl: string;
    coachingStyle: string;
    specialtyTags: string[];
}

export const coaches: CoachPersona[] = [
    {
        id: 'bodybuilding',
        fullName: 'Marcus',
        nickname: 'The Titan',
        displayName: "Marcus 'The Titan'",
        avatarUrl: '/avatars/coach-bodybuilding.png',
        coachingStyle:
            'Structured hypertrophy programs with progressive overload. Focuses on volume, intensity, and muscle isolation to maximize size and symmetry.',
        specialtyTags: ['Hypertrophy', 'Progressive Overload', 'Split Training', 'Posing'],
    },
    {
        id: 'booty-builder',
        fullName: 'Brianna',
        nickname: 'The Sculptor',
        displayName: "Brianna 'The Sculptor'",
        avatarUrl: '/avatars/coach-booty-builder.png',
        coachingStyle:
            'Women-focused glute and lower body programming. Combines hip thrusts, lunges, and targeted accessories for shape, strength, and confidence.',
        specialtyTags: ['Glute Training', 'Lower Body', 'Women-Focused', 'Body Sculpting'],
    },
    {
        id: 'crossfit',
        fullName: 'Derek',
        nickname: 'The Engine',
        displayName: "Derek 'The Engine'",
        avatarUrl: '/avatars/coach-crossfit.png',
        coachingStyle:
            'High-intensity functional workouts combining gymnastics, weightlifting, and metabolic conditioning. Built for those who want to be ready for anything.',
        specialtyTags: ['WODs', 'Olympic Lifting', 'Conditioning', 'Gymnastics'],
    },
    {
        id: 'old-school',
        fullName: 'Frank',
        nickname: 'The Classic',
        displayName: "Frank 'The Classic'",
        avatarUrl: '/avatars/coach-old-school.png',
        coachingStyle:
            'Golden era training philosophy inspired by legends like Arnold and Franco. Heavy compound lifts, high volume, and no shortcuts.',
        specialtyTags: ['Golden Era', 'Compound Lifts', 'High Volume', 'Classic Physique'],
    },
    {
        id: 'science-based',
        fullName: 'Dr. Elena',
        nickname: 'The Professor',
        displayName: "Dr. Elena 'The Professor'",
        avatarUrl: '/avatars/coach-science-based.png',
        coachingStyle:
            'Evidence-driven programming grounded in exercise science research. Every rep, set, and rest period is backed by peer-reviewed data.',
        specialtyTags: ['Evidence-Based', 'Periodization', 'Research-Driven', 'Data Analysis'],
    },
    {
        id: 'beach-body',
        fullName: 'Ryan',
        nickname: 'The Shredder',
        displayName: "Ryan 'The Shredder'",
        avatarUrl: '/avatars/coach-beach-body.png',
        coachingStyle:
            'Aesthetics-first training targeting six-pack abs, defined arms, and a V-taper. Combines resistance training with strategic cardio and nutrition.',
        specialtyTags: ['Aesthetics', 'Six Pack', 'Fat Loss', 'V-Taper'],
    },
    {
        id: 'everyday-fitness',
        fullName: 'Sam',
        nickname: 'The Guide',
        displayName: "Sam 'The Guide'",
        avatarUrl: '/avatars/coach-everyday.png',
        coachingStyle:
            'Balanced programs for general health and wellness. Sustainable routines that fit into a busy lifestyle without burnout or injury.',
        specialtyTags: ['General Health', 'Wellness', 'Sustainable', 'Beginner-Friendly'],
    },
    {
        id: 'athletic-functionality',
        fullName: 'Kai',
        nickname: 'The Mover',
        displayName: "Kai 'The Mover'",
        avatarUrl: '/avatars/coach-functional.png',
        coachingStyle:
            'Functional movement training that builds real-world strength, mobility, and coordination. Move better, feel better, perform better.',
        specialtyTags: ['Functional Movement', 'Mobility', 'Coordination', 'Injury Prevention'],
    },
    {
        id: 'sport-basketball',
        fullName: 'Jamal',
        nickname: 'The Court General',
        displayName: "Jamal 'The Court General'",
        avatarUrl: '/avatars/coach-basketball.png',
        coachingStyle:
            'Basketball-specific training for vertical jump, agility, court speed, and game endurance. Programs designed to elevate on-court performance.',
        specialtyTags: ['Basketball', 'Vertical Jump', 'Agility', 'Sport-Specific'],
    },
    {
        id: 'sport-climbing',
        fullName: 'Lena',
        nickname: 'The Ascender',
        displayName: "Lena 'The Ascender'",
        avatarUrl: '/avatars/coach-climbing.png',
        coachingStyle:
            'Climbing-focused training for grip strength, finger endurance, core tension, and route-reading strategy. Send harder, climb longer.',
        specialtyTags: ['Climbing', 'Grip Strength', 'Core Tension', 'Sport-Specific'],
    },
];
