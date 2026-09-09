/**
 * The landing page FAQ, in one place.
 *
 * Faq.tsx renders these and the FAQPage JSON-LD on the landing page is built from the same
 * array, so the structured data can never describe an answer that is not visible on the page —
 * marking up FAQs that a visitor cannot see is a Google structured-data violation.
 */
export interface FaqItem {
    q: string;
    a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
    {
        q: 'Which lifts does it score?',
        a: 'In the gym: bench press, squat, deadlift, lateral raise and barbell curl. At home: bodyweight squats, push-ups, crunches, the plank, pull-ups and hip thrusts. The live coach counts reps from the selfie camera without recording, calls the rest and the next set. The bench press is measured in 3D when the body scan runs; from the foot end of a bench, angles that cannot be read in 2D are left unscored rather than guessed.',
    },
    {
        q: 'Do I need a wearable or a fixed camera?',
        a: 'No. Any phone, propped against a plate or held by a friend, from any angle with normal gym light. The lifter is tracked, not the room, and bystanders are ignored.',
    },
    {
        q: 'Is my video uploaded?',
        a: 'Not for the standard analysis: pose tracking, rep counting and the form check run in the browser on the phone. Two options send the clip to a server you run yourself, the 3D body scan and the reconstruction of your real room.',
    },
    {
        q: 'How is the technique score made?',
        a: 'Each exercise has written rules. For the bench press: elbow-to-torso between 30 and 80 degrees, the smallest elbow angle in the rep between 85 and 95, a concentric of at least half a second. Every rep is checked against them and the warning names the rep, the joint and the number.',
    },
    {
        q: 'What is the AR view?',
        a: 'On iPhone the set is exported as an animated USDZ and opened with AR Quick Look. For the bench press you tap your own bench and the avatar lies on it, feet toward you, at true scale; for standing lifts you tap the floor where the athlete stands.',
    },
    {
        q: 'Does it work on Android and on a laptop?',
        a: 'The replay, the reps and the form check work in any modern browser. AR placement is iPhone only for now.',
    },
];
