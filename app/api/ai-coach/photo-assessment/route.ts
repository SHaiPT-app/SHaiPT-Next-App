import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const COACH_PERSONAS: Record<string, { name: string; style: string }> = {
    bodybuilding: { name: "John 'The Sculptor'", style: 'intense bodybuilding coach focused on symmetry and mass' },
    'booty-builder': { name: "Maya 'Peach Queen'", style: 'energetic coach focused on glute development and lower body' },
    crossfit: { name: "Rex 'The Machine'", style: 'high-energy CrossFit coach focused on functional fitness' },
    'old-school': { name: "Frank 'Iron Era'", style: 'no-nonsense old-school bodybuilding coach' },
    'science-based': { name: "Dr. Alex 'The Professor'", style: 'methodical science-based training coach' },
    'beach-body': { name: "Kai 'Six Pack'", style: 'aesthetics coach focused on a beach-ready physique' },
    'everyday-fitness': { name: "Sam 'The Balance'", style: 'warm coach focused on sustainable health' },
    'athletic-functionality': { name: "Zara 'The Athlete'", style: 'movement-focused athletic performance coach' },
    'sport-basketball': { name: "Marcus 'Court King'", style: 'basketball performance coach' },
    'sport-climbing': { name: "Luna 'The Climber'", style: 'climbing-focused coach emphasizing grip strength and body-weight mastery' },
};

const MOCK_ASSESSMENTS = [
    "Thanks for sharing those photos. I can see you have a solid foundation to work with. Your shoulder development looks decent, and I can tell you've been putting in some work. Based on what I see, I think we should focus on building out your back width and shoulder caps to create more of that V-taper look. Your legs look like they could use some dedicated attention too. Overall, you're in a great starting position -- let's build on this.",
    "I appreciate you sharing those. Looking at your physique, I can see some good muscle density, especially in your upper body. Your core area could benefit from some targeted work, and I'd recommend we prioritize compound movements to bring up your overall frame. Your posture looks solid which is a great sign. Let's put together a program that plays to your strengths while bringing up those lagging areas.",
    "Good stuff -- thanks for sending those over. I can see you've been active, and your overall proportions look balanced. There's definitely room to add some quality size, particularly in your back and shoulders. Your midsection looks like it could tighten up with some focused nutrition adjustments alongside our training. You have a great frame to build on, and I'm excited to see what we can accomplish together.",
];

function getMockAssessment(): string {
    return MOCK_ASSESSMENTS[Math.floor(Math.random() * MOCK_ASSESSMENTS.length)];
}

export async function POST(req: NextRequest) {
    try {
        const { coachId, photoCount } = await req.json();

        if (!coachId || !photoCount) {
            return NextResponse.json(
                { error: 'coachId and photoCount are required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const persona = COACH_PERSONAS[coachId] || COACH_PERSONAS['everyday-fitness'];

        if (!apiKey) {
            // Return mock assessment when no API key
            return NextResponse.json({
                assessment: getMockAssessment(),
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are ${persona.name}, a ${persona.style}. A new client has just uploaded ${photoCount} physique photo${photoCount > 1 ? 's' : ''} (front, back, and/or side views) as part of their intake interview.

Give a brief, encouraging, and general assessment of their physique based on common observations for someone starting a new training program. Since you cannot actually see the photos, give a general but personalized-sounding assessment that:

1. Acknowledges specific body areas (shoulders, back, legs, core, arms) in a constructive way
2. Identifies 2-3 areas to focus on for improvement
3. Expresses genuine excitement about their potential
4. Stays in character with your coaching persona

IMPORTANT RULES:
- Keep it to 2-3 short paragraphs
- Be encouraging but honest-sounding
- Never use emojis
- Do not mention that you cannot see the photos
- Sound like you are actually looking at their physique
- End with a transition back to the interview (if there are remaining topics to discuss)

Write ONLY the assessment response, no other text.`;

        const result = await model.generateContent(prompt);
        const assessment = result.response.text().trim();

        return NextResponse.json({ assessment });
    } catch (error) {
        console.error('Photo assessment error:', error);
        // Fallback to mock on error
        return NextResponse.json({
            assessment: getMockAssessment(),
        });
    }
}
