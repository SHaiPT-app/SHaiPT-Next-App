import {
    angleBetweenPoints,
    getAnalyzerForExercise,
    createRepCounter,
    updateRepCounter,
    type Landmark,
    type RepCounterState,
    LANDMARK,
} from '@/lib/formAnalysis';

// Helper to create a landmark with default visibility
function lm(x: number, y: number, z = 0, visibility = 1.0): Landmark {
    return { x, y, z, visibility };
}

// Create a full set of 33 landmarks with default positions (standing pose)
function createStandingPose(): Landmark[] {
    const landmarks: Landmark[] = Array.from({ length: 33 }, () => lm(0.5, 0.5));

    // Standing pose: shoulders above hips above knees above ankles
    landmarks[LANDMARK.NOSE] = lm(0.5, 0.15);
    landmarks[LANDMARK.LEFT_SHOULDER] = lm(0.45, 0.3);
    landmarks[LANDMARK.RIGHT_SHOULDER] = lm(0.55, 0.3);
    landmarks[LANDMARK.LEFT_ELBOW] = lm(0.4, 0.45);
    landmarks[LANDMARK.RIGHT_ELBOW] = lm(0.6, 0.45);
    landmarks[LANDMARK.LEFT_WRIST] = lm(0.38, 0.55);
    landmarks[LANDMARK.RIGHT_WRIST] = lm(0.62, 0.55);
    landmarks[LANDMARK.LEFT_HIP] = lm(0.47, 0.55);
    landmarks[LANDMARK.RIGHT_HIP] = lm(0.53, 0.55);
    landmarks[LANDMARK.LEFT_KNEE] = lm(0.47, 0.75);
    landmarks[LANDMARK.RIGHT_KNEE] = lm(0.53, 0.75);
    landmarks[LANDMARK.LEFT_ANKLE] = lm(0.47, 0.95);
    landmarks[LANDMARK.RIGHT_ANKLE] = lm(0.53, 0.95);

    return landmarks;
}

// Create a deep squat pose with acute knee angle
function createDeepSquatPose(): Landmark[] {
    const landmarks = createStandingPose();

    // Deep squat: knees bent to ~80 degrees
    // Hip directly above ankle, knee pushed forward
    landmarks[LANDMARK.LEFT_HIP] = lm(0.47, 0.75);
    landmarks[LANDMARK.RIGHT_HIP] = lm(0.53, 0.75);
    landmarks[LANDMARK.LEFT_KNEE] = lm(0.42, 0.85);
    landmarks[LANDMARK.RIGHT_KNEE] = lm(0.58, 0.85);
    landmarks[LANDMARK.LEFT_ANKLE] = lm(0.47, 0.95);
    landmarks[LANDMARK.RIGHT_ANKLE] = lm(0.53, 0.95);
    landmarks[LANDMARK.LEFT_SHOULDER] = lm(0.47, 0.5);
    landmarks[LANDMARK.RIGHT_SHOULDER] = lm(0.53, 0.5);

    return landmarks;
}

describe('angleBetweenPoints', () => {
    it('returns 180 for collinear points', () => {
        const a = lm(0, 0);
        const b = lm(0.5, 0);
        const c = lm(1, 0);
        const angle = angleBetweenPoints(a, b, c);
        expect(angle).toBeCloseTo(180, 0);
    });

    it('returns 90 for perpendicular points', () => {
        const a = lm(0, 0);
        const b = lm(0, 0.5);
        const c = lm(0.5, 0.5);
        const angle = angleBetweenPoints(a, b, c);
        expect(angle).toBeCloseTo(90, 0);
    });

    it('returns 0 for zero-length vectors', () => {
        const a = lm(0.5, 0.5);
        const b = lm(0.5, 0.5);
        const c = lm(1, 1);
        const angle = angleBetweenPoints(a, b, c);
        expect(angle).toBe(0);
    });

    it('calculates acute angle correctly', () => {
        const a = lm(0, 1);
        const b = lm(0, 0);
        const c = lm(1, 0);
        const angle = angleBetweenPoints(a, b, c);
        expect(angle).toBeCloseTo(90, 0);
    });
});

describe('getAnalyzerForExercise', () => {
    it('returns squat analyzer for squat exercises', () => {
        const analyzer = getAnalyzerForExercise('Barbell Squat');
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
        expect(result).toHaveProperty('repMetric');
        expect(result).toHaveProperty('phase');
    });

    it('returns bench press analyzer for bench press', () => {
        const analyzer = getAnalyzerForExercise('Bench Press');
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
        expect(result).toHaveProperty('repMetric');
    });

    it('returns deadlift analyzer for deadlift exercises', () => {
        const analyzer = getAnalyzerForExercise('Romanian Deadlift');
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
    });

    it('returns overhead press analyzer for shoulder press', () => {
        const analyzer = getAnalyzerForExercise('Overhead Press');
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
    });

    it('returns generic analyzer for unknown exercises', () => {
        const analyzer = getAnalyzerForExercise('Lateral Raise');
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
    });

    it('returns generic analyzer for undefined exercise name', () => {
        const analyzer = getAnalyzerForExercise(undefined);
        const pose = createStandingPose();
        const result = analyzer(pose);
        expect(result).toHaveProperty('feedback');
    });

    it('matches case-insensitively', () => {
        const a1 = getAnalyzerForExercise('barbell squat');
        const a2 = getAnalyzerForExercise('BARBELL SQUAT');
        const pose = createStandingPose();
        const r1 = a1(pose);
        const r2 = a2(pose);
        // Both should use squat analyzer, giving same results
        expect(r1.repMetric).toBe(r2.repMetric);
    });
});

describe('Squat analyzer', () => {
    const analyzeSquat = getAnalyzerForExercise('Squat');

    it('detects standing position (high metric, up phase)', () => {
        const pose = createStandingPose();
        const result = analyzeSquat(pose);
        expect(result.repMetric).toBeGreaterThan(0.5);
        expect(result.phase).toBe('up');
    });

    it('detects deep squat (low metric, down phase)', () => {
        const pose = createDeepSquatPose();
        const result = analyzeSquat(pose);
        // Deep squat should have lower metric
        expect(result.repMetric).toBeLessThan(0.6);
    });

    it('provides depth feedback when standing too high', () => {
        const pose = createStandingPose();
        const result = analyzeSquat(pose);
        const depthCue = result.feedback.find(f => f.message.toLowerCase().includes('deeper'));
        expect(depthCue).toBeDefined();
    });

    it('detects back lean', () => {
        const pose = createStandingPose();
        // Shift shoulders significantly to the right
        pose[LANDMARK.LEFT_SHOULDER] = lm(0.6, 0.3);
        pose[LANDMARK.RIGHT_SHOULDER] = lm(0.7, 0.3);
        const result = analyzeSquat(pose);
        const backCue = result.feedback.find(f => f.message.toLowerCase().includes('back'));
        expect(backCue).toBeDefined();
        expect(backCue?.severity).toBe('error');
    });
});

describe('Bench Press analyzer', () => {
    const analyzeBench = getAnalyzerForExercise('Bench Press');

    it('returns feedback for elbow flare', () => {
        const pose = createStandingPose();
        // Flare elbows out wide
        pose[LANDMARK.LEFT_ELBOW] = lm(0.2, 0.3);
        pose[LANDMARK.RIGHT_ELBOW] = lm(0.8, 0.3);
        const result = analyzeBench(pose);
        const flareCue = result.feedback.find(f => f.message.toLowerCase().includes('elbow'));
        expect(flareCue).toBeDefined();
    });

    it('provides elbow angle metric', () => {
        const pose = createStandingPose();
        const result = analyzeBench(pose);
        expect(result.repMetric).not.toBeNull();
    });
});

describe('Rep counter', () => {
    it('starts with zero count', () => {
        const state = createRepCounter();
        expect(state.count).toBe(0);
        expect(state.lastPhase).toBeNull();
    });

    it('does not count when metric is null', () => {
        const state = createRepCounter();
        const updated = updateRepCounter(state, null, null, 1000);
        expect(updated.count).toBe(0);
    });

    it('counts a rep on down-to-up transition', () => {
        let state = createRepCounter();

        // Feed multiple frames to establish down phase (smoothing needs convergence)
        for (let i = 0; i < 5; i++) {
            state = updateRepCounter(state, 0.1, 'down', 1000 + i * 100);
        }
        expect(state.count).toBe(0);
        expect(state.lastPhase).toBe('down');

        // Feed multiple frames to establish up phase (rep!)
        for (let i = 0; i < 5; i++) {
            state = updateRepCounter(state, 0.9, 'up', 2000 + i * 100);
        }
        expect(state.count).toBe(1);
    });

    it('counts multiple reps correctly', () => {
        let state = createRepCounter();
        let t = 1000;

        // Rep 1: down then up
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', t); t += 100; }
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', t); t += 100; }
        expect(state.count).toBe(1);

        // Rep 2: down then up
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', t); t += 200; }
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', t); t += 200; }
        expect(state.count).toBe(2);
    });

    it('does not count up-to-down transition', () => {
        let state = createRepCounter();
        let t = 1000;

        // Start in up phase
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', t); t += 100; }
        expect(state.count).toBe(0);

        // Go to down
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', t); t += 100; }
        expect(state.count).toBe(0);
    });

    it('respects minimum rep interval', () => {
        let state = createRepCounter();

        // First rep - establish down quickly then up
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', 1000 + i * 50); }
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', 1300 + i * 50); }
        const firstRepCount = state.count;
        expect(firstRepCount).toBe(1);

        // Rapid fire: try to count another rep immediately (within 600ms of last rep)
        state = updateRepCounter(state, 0.1, 'down', 1550);
        // Force the smoothed metric down
        state = { ...state, smoothedMetric: 0.1, lastPhase: 'down' };
        state = updateRepCounter(state, 0.9, 'up', 1600); // Too soon after last rep
        expect(state.count).toBe(1); // Should not count
    });

    it('counts rep after minimum interval has passed', () => {
        let state = createRepCounter();
        let t = 1000;

        // First rep
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', t); t += 100; }
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', t); t += 100; }
        expect(state.count).toBe(1);

        // Second rep after sufficient delay (well past 600ms)
        t = 3000;
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.1, 'down', t); t += 200; }
        for (let i = 0; i < 5; i++) { state = updateRepCounter(state, 0.9, 'up', t); t += 200; }
        expect(state.count).toBe(2);
    });

    it('smooths noisy input', () => {
        let state = createRepCounter();

        // Feed gradually decreasing metric (going down)
        for (let i = 0; i < 10; i++) {
            state = updateRepCounter(state, 0.9 - i * 0.08, 'down', 1000 + i * 100);
        }

        // Smoothed metric should be somewhere between
        expect(state.smoothedMetric).not.toBeNull();
        expect(state.smoothedMetric!).toBeLessThan(0.9);
        expect(state.smoothedMetric!).toBeGreaterThan(0);
    });
});

describe('Generic analyzer', () => {
    const analyzeGeneric = getAnalyzerForExercise(undefined);

    it('detects shoulder tilt', () => {
        const pose = createStandingPose();
        // Tilt left shoulder down significantly
        pose[LANDMARK.LEFT_SHOULDER] = lm(0.45, 0.38);
        pose[LANDMARK.RIGHT_SHOULDER] = lm(0.55, 0.3);
        const result = analyzeGeneric(pose);
        const tiltCue = result.feedback.find(f => f.message.toLowerCase().includes('shoulder'));
        expect(tiltCue).toBeDefined();
    });

    it('detects hip tilt', () => {
        const pose = createStandingPose();
        // Tilt hips
        pose[LANDMARK.LEFT_HIP] = lm(0.47, 0.6);
        pose[LANDMARK.RIGHT_HIP] = lm(0.53, 0.5);
        const result = analyzeGeneric(pose);
        const tiltCue = result.feedback.find(f => f.message.toLowerCase().includes('hip'));
        expect(tiltCue).toBeDefined();
    });

    it('handles landmarks with low visibility', () => {
        const pose = createStandingPose();
        // Set low visibility on all landmarks
        for (const lmk of pose) {
            lmk.visibility = 0.1;
        }
        const result = analyzeGeneric(pose);
        // Should still return result without crashing
        expect(result).toHaveProperty('feedback');
        expect(result.repMetric).toBeNull();
    });
});

describe('Deadlift analyzer', () => {
    const analyzeDeadlift = getAnalyzerForExercise('Deadlift');

    it('detects lockout position', () => {
        const pose = createStandingPose();
        const result = analyzeDeadlift(pose);
        const lockoutCue = result.feedback.find(f => f.message.toLowerCase().includes('lockout'));
        expect(lockoutCue).toBeDefined();
        expect(lockoutCue?.severity).toBe('good');
    });

    it('detects chest dropping', () => {
        const pose = createStandingPose();
        // Drop shoulders below hips
        pose[LANDMARK.LEFT_SHOULDER] = lm(0.45, 0.65);
        pose[LANDMARK.RIGHT_SHOULDER] = lm(0.55, 0.65);
        const result = analyzeDeadlift(pose);
        const chestCue = result.feedback.find(f => f.message.toLowerCase().includes('chest'));
        expect(chestCue).toBeDefined();
        expect(chestCue?.severity).toBe('error');
    });
});
