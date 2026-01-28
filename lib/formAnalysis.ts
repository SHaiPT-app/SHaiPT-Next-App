// ============================================
// Form Analysis Engine
// Analyzes MediaPipe pose landmarks for exercise form
// feedback and automatic rep counting.
// ============================================

export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

// Landmark indices (MediaPipe Pose)
export const LANDMARK = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
} as const;

// ============================================
// Geometry Utilities
// ============================================

/** Calculate angle at point B given three points A, B, C (in degrees) */
export function angleBetweenPoints(a: Landmark, b: Landmark, c: Landmark): number {
    const v1 = [a.x - b.x, a.y - b.y];
    const v2 = [c.x - b.x, c.y - b.y];
    const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    if (mag1 === 0 || mag2 === 0) return 0;
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/** Check if a landmark has sufficient visibility */
function isVisible(lm: Landmark | undefined, threshold = 0.4): boolean {
    return !!lm && (lm.visibility ?? 1) >= threshold;
}

/** Average of two values if both defined, or whichever is defined */
function avg(a: number | null, b: number | null): number | null {
    if (a !== null && b !== null) return (a + b) / 2;
    return a ?? b;
}

// ============================================
// Form Feedback
// ============================================

export interface FormFeedback {
    message: string;
    severity: 'good' | 'warning' | 'error';
}

// ============================================
// Exercise-specific form analysis
// ============================================

type ExerciseAnalyzer = (landmarks: Landmark[]) => {
    feedback: FormFeedback[];
    /** A metric value (0-1) indicating rep progress; used for rep counting */
    repMetric: number | null;
    /** 'down' or 'up' phase of the movement */
    phase: 'down' | 'up' | null;
};

function analyzeSquat(landmarks: Landmark[]): ReturnType<ExerciseAnalyzer> {
    const feedback: FormFeedback[] = [];
    const lHip = landmarks[LANDMARK.LEFT_HIP];
    const rHip = landmarks[LANDMARK.RIGHT_HIP];
    const lKnee = landmarks[LANDMARK.LEFT_KNEE];
    const rKnee = landmarks[LANDMARK.RIGHT_KNEE];
    const lAnkle = landmarks[LANDMARK.LEFT_ANKLE];
    const rAnkle = landmarks[LANDMARK.RIGHT_ANKLE];
    const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];

    let kneeAngle: number | null = null;

    // Knee angle (hip-knee-ankle)
    if (isVisible(lHip) && isVisible(lKnee) && isVisible(lAnkle)) {
        kneeAngle = angleBetweenPoints(lHip, lKnee, lAnkle);
    }
    let rKneeAngle: number | null = null;
    if (isVisible(rHip) && isVisible(rKnee) && isVisible(rAnkle)) {
        rKneeAngle = angleBetweenPoints(rHip, rKnee, rAnkle);
    }

    const avgKneeAngle = avg(kneeAngle, rKneeAngle);

    if (avgKneeAngle !== null) {
        if (avgKneeAngle > 160) {
            feedback.push({ message: 'Go deeper into the squat', severity: 'warning' });
        } else if (avgKneeAngle < 70) {
            feedback.push({ message: 'Good depth', severity: 'good' });
        }
    }

    // Back straightness: check if shoulders are roughly above hips
    if (isVisible(lShoulder) && isVisible(rShoulder) && isVisible(lHip) && isVisible(rHip)) {
        const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
        const hipMidX = (lHip.x + rHip.x) / 2;
        const lean = Math.abs(shoulderMidX - hipMidX);
        if (lean > 0.08) {
            feedback.push({ message: 'Keep your back straight', severity: 'error' });
        }
    }

    // Knee tracking: knees should not cave inward
    if (isVisible(lKnee) && isVisible(rKnee) && isVisible(lAnkle) && isVisible(rAnkle)) {
        const lKneeInward = lKnee.x > lAnkle.x + 0.03;
        const rKneeInward = rKnee.x < rAnkle.x - 0.03;
        if (lKneeInward || rKneeInward) {
            feedback.push({ message: 'Push knees out over toes', severity: 'warning' });
        }
    }

    // Rep metric: normalized knee angle (standing=180 -> 1.0, deep squat=70 -> 0.0)
    const metric = avgKneeAngle !== null
        ? Math.max(0, Math.min(1, (avgKneeAngle - 70) / (170 - 70)))
        : null;

    const phase = metric !== null ? (metric < 0.5 ? 'down' : 'up') : null;

    return { feedback, repMetric: metric, phase };
}

function analyzeBenchPress(landmarks: Landmark[]): ReturnType<ExerciseAnalyzer> {
    const feedback: FormFeedback[] = [];
    const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const lElbow = landmarks[LANDMARK.LEFT_ELBOW];
    const rElbow = landmarks[LANDMARK.RIGHT_ELBOW];
    const lWrist = landmarks[LANDMARK.LEFT_WRIST];
    const rWrist = landmarks[LANDMARK.RIGHT_WRIST];
    const lHip = landmarks[LANDMARK.LEFT_HIP];
    const rHip = landmarks[LANDMARK.RIGHT_HIP];

    let elbowAngle: number | null = null;

    // Elbow angle (shoulder-elbow-wrist)
    if (isVisible(lShoulder) && isVisible(lElbow) && isVisible(lWrist)) {
        elbowAngle = angleBetweenPoints(lShoulder, lElbow, lWrist);
    }
    let rElbowAngle: number | null = null;
    if (isVisible(rShoulder) && isVisible(rElbow) && isVisible(rWrist)) {
        rElbowAngle = angleBetweenPoints(rShoulder, rElbow, rWrist);
    }

    const avgElbowAngle = avg(elbowAngle, rElbowAngle);

    // Elbow flare angle (shoulder-elbow relative to shoulder-hip vector)
    let flareDetected = false;
    if (isVisible(lShoulder) && isVisible(lElbow) && isVisible(lHip)) {
        const flareAngle = angleBetweenPoints(lElbow, lShoulder, lHip);
        if (flareAngle > 80) {
            feedback.push({ message: 'Tuck elbows closer to body', severity: 'warning' });
            flareDetected = true;
        } else if (flareAngle >= 40 && flareAngle <= 60) {
            feedback.push({ message: 'Good elbow position', severity: 'good' });
        }
    }
    if (!flareDetected && isVisible(rShoulder) && isVisible(rElbow) && isVisible(rHip)) {
        const flareAngle = angleBetweenPoints(rElbow, rShoulder, rHip);
        if (flareAngle > 80) {
            feedback.push({ message: 'Tuck elbows closer to body', severity: 'warning' });
        }
    }

    // Wrist alignment: wrists should be roughly above elbows
    if (isVisible(lWrist) && isVisible(lElbow) && isVisible(rWrist) && isVisible(rElbow)) {
        const lDrift = Math.abs(lWrist.x - lElbow.x);
        const rDrift = Math.abs(rWrist.x - rElbow.x);
        if (lDrift > 0.06 || rDrift > 0.06) {
            feedback.push({ message: 'Keep wrists stacked over elbows', severity: 'warning' });
        }
    }

    // Rep metric: elbow angle (locked out=170 -> 1.0, bottom=60 -> 0.0)
    const metric = avgElbowAngle !== null
        ? Math.max(0, Math.min(1, (avgElbowAngle - 60) / (170 - 60)))
        : null;

    const phase = metric !== null ? (metric < 0.5 ? 'down' : 'up') : null;

    return { feedback, repMetric: metric, phase };
}

function analyzeDeadlift(landmarks: Landmark[]): ReturnType<ExerciseAnalyzer> {
    const feedback: FormFeedback[] = [];
    const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const lHip = landmarks[LANDMARK.LEFT_HIP];
    const rHip = landmarks[LANDMARK.RIGHT_HIP];
    const lKnee = landmarks[LANDMARK.LEFT_KNEE];
    const rKnee = landmarks[LANDMARK.RIGHT_KNEE];

    let hipAngle: number | null = null;

    // Hip hinge angle (shoulder-hip-knee)
    if (isVisible(lShoulder) && isVisible(lHip) && isVisible(lKnee)) {
        hipAngle = angleBetweenPoints(lShoulder, lHip, lKnee);
    }
    let rHipAngle: number | null = null;
    if (isVisible(rShoulder) && isVisible(rHip) && isVisible(rKnee)) {
        rHipAngle = angleBetweenPoints(rShoulder, rHip, rKnee);
    }

    const avgHipAngle = avg(hipAngle, rHipAngle);

    // Back rounding check: shoulder should stay above hip in Y
    if (isVisible(lShoulder) && isVisible(rShoulder) && isVisible(lHip) && isVisible(rHip)) {
        const shoulderMidY = (lShoulder.y + rShoulder.y) / 2;
        const hipMidY = (lHip.y + rHip.y) / 2;
        // In image coords, y increases downward. Shoulders should be above (lower y) than hips.
        // If shoulders are close to hips y, likely rounding.
        if (shoulderMidY > hipMidY + 0.02) {
            feedback.push({ message: 'Keep your chest up', severity: 'error' });
        }
    }

    // Lockout cue
    if (avgHipAngle !== null && avgHipAngle > 160) {
        feedback.push({ message: 'Good lockout', severity: 'good' });
    }

    // Rep metric: hip angle (standing=170 -> 1.0, bent=80 -> 0.0)
    const metric = avgHipAngle !== null
        ? Math.max(0, Math.min(1, (avgHipAngle - 80) / (170 - 80)))
        : null;

    const phase = metric !== null ? (metric < 0.5 ? 'down' : 'up') : null;

    return { feedback, repMetric: metric, phase };
}

function analyzeOverheadPress(landmarks: Landmark[]): ReturnType<ExerciseAnalyzer> {
    const feedback: FormFeedback[] = [];
    const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const lElbow = landmarks[LANDMARK.LEFT_ELBOW];
    const rElbow = landmarks[LANDMARK.RIGHT_ELBOW];
    const lWrist = landmarks[LANDMARK.LEFT_WRIST];
    const rWrist = landmarks[LANDMARK.RIGHT_WRIST];
    const lHip = landmarks[LANDMARK.LEFT_HIP];
    const rHip = landmarks[LANDMARK.RIGHT_HIP];

    let elbowAngle: number | null = null;
    if (isVisible(lShoulder) && isVisible(lElbow) && isVisible(lWrist)) {
        elbowAngle = angleBetweenPoints(lShoulder, lElbow, lWrist);
    }
    let rElbowAngle: number | null = null;
    if (isVisible(rShoulder) && isVisible(rElbow) && isVisible(rWrist)) {
        rElbowAngle = angleBetweenPoints(rShoulder, rElbow, rWrist);
    }

    const avgElbowAngle = avg(elbowAngle, rElbowAngle);

    // Excessive lean back
    if (isVisible(lShoulder) && isVisible(rShoulder) && isVisible(lHip) && isVisible(rHip)) {
        const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
        const hipMidX = (lHip.x + rHip.x) / 2;
        const lean = shoulderMidX - hipMidX;
        if (Math.abs(lean) > 0.06) {
            feedback.push({ message: 'Avoid leaning back too far', severity: 'warning' });
        }
    }

    // Rep metric: elbow angle (locked out=170 -> 1.0, bottom=60 -> 0.0)
    const metric = avgElbowAngle !== null
        ? Math.max(0, Math.min(1, (avgElbowAngle - 60) / (170 - 60)))
        : null;

    const phase = metric !== null ? (metric < 0.5 ? 'down' : 'up') : null;

    return { feedback, repMetric: metric, phase };
}

function analyzeGeneric(landmarks: Landmark[]): ReturnType<ExerciseAnalyzer> {
    const feedback: FormFeedback[] = [];

    // Generic posture check
    const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const lHip = landmarks[LANDMARK.LEFT_HIP];
    const rHip = landmarks[LANDMARK.RIGHT_HIP];

    if (isVisible(lShoulder) && isVisible(rShoulder)) {
        const shoulderTilt = Math.abs(lShoulder.y - rShoulder.y);
        if (shoulderTilt > 0.05) {
            feedback.push({ message: 'Keep shoulders level', severity: 'warning' });
        }
    }

    if (isVisible(lHip) && isVisible(rHip)) {
        const hipTilt = Math.abs(lHip.y - rHip.y);
        if (hipTilt > 0.05) {
            feedback.push({ message: 'Keep hips level', severity: 'warning' });
        }
    }

    // Generic rep metric using elbow angles
    const lElbow = landmarks[LANDMARK.LEFT_ELBOW];
    const rElbow = landmarks[LANDMARK.RIGHT_ELBOW];
    const lWrist = landmarks[LANDMARK.LEFT_WRIST];
    const rWrist = landmarks[LANDMARK.RIGHT_WRIST];

    let elbowAngle: number | null = null;
    if (isVisible(lShoulder) && isVisible(lElbow) && isVisible(lWrist)) {
        elbowAngle = angleBetweenPoints(lShoulder, lElbow, lWrist);
    }
    let rElbowAngle: number | null = null;
    if (isVisible(rShoulder) && isVisible(rElbow) && isVisible(rWrist)) {
        rElbowAngle = angleBetweenPoints(rShoulder, rElbow, rWrist);
    }

    const avgAngle = avg(elbowAngle, rElbowAngle);
    const metric = avgAngle !== null
        ? Math.max(0, Math.min(1, (avgAngle - 40) / (170 - 40)))
        : null;

    const phase = metric !== null ? (metric < 0.5 ? 'down' : 'up') : null;

    return { feedback, repMetric: metric, phase };
}

// ============================================
// Exercise Name Matching
// ============================================

const EXERCISE_PATTERNS: Array<{ pattern: RegExp; analyzer: ExerciseAnalyzer }> = [
    { pattern: /squat/i, analyzer: analyzeSquat },
    { pattern: /bench\s*press|chest\s*press|push.*up/i, analyzer: analyzeBenchPress },
    { pattern: /dead\s*lift|rdl|romanian/i, analyzer: analyzeDeadlift },
    { pattern: /overhead\s*press|shoulder\s*press|military\s*press|ohp/i, analyzer: analyzeOverheadPress },
];

export function getAnalyzerForExercise(exerciseName: string | undefined): ExerciseAnalyzer {
    if (!exerciseName) return analyzeGeneric;
    for (const { pattern, analyzer } of EXERCISE_PATTERNS) {
        if (pattern.test(exerciseName)) return analyzer;
    }
    return analyzeGeneric;
}

// ============================================
// Rep Counter
// ============================================

export interface RepCounterState {
    count: number;
    /** Previous phase to detect transitions */
    lastPhase: 'down' | 'up' | null;
    /** Smoothed metric for noise filtering */
    smoothedMetric: number | null;
    /** Timestamp of last rep to prevent double-counting */
    lastRepTime: number;
}

export function createRepCounter(): RepCounterState {
    return {
        count: 0,
        lastPhase: null,
        smoothedMetric: null,
        lastRepTime: 0,
    };
}

const SMOOTHING_FACTOR = 0.3;
const MIN_REP_INTERVAL_MS = 600;

/**
 * Update rep counter with new metric. Returns updated state (creates new object).
 * A rep is counted when transitioning from 'down' phase back to 'up' phase.
 */
export function updateRepCounter(
    state: RepCounterState,
    metric: number | null,
    phase: 'down' | 'up' | null,
    nowMs: number = Date.now(),
): RepCounterState {
    if (metric === null || phase === null) {
        return state;
    }

    // Smooth the metric to avoid noise
    const smoothed = state.smoothedMetric !== null
        ? state.smoothedMetric * (1 - SMOOTHING_FACTOR) + metric * SMOOTHING_FACTOR
        : metric;

    // Determine smoothed phase
    const smoothedPhase: 'down' | 'up' = smoothed < 0.45 ? 'down' : 'up';

    let newCount = state.count;
    let lastRepTime = state.lastRepTime;

    // Count rep on transition from down -> up (concentric phase completion)
    if (state.lastPhase === 'down' && smoothedPhase === 'up') {
        const timeSinceLastRep = nowMs - state.lastRepTime;
        if (timeSinceLastRep >= MIN_REP_INTERVAL_MS) {
            newCount = state.count + 1;
            lastRepTime = nowMs;
        }
    }

    return {
        count: newCount,
        lastPhase: smoothedPhase,
        smoothedMetric: smoothed,
        lastRepTime,
    };
}
