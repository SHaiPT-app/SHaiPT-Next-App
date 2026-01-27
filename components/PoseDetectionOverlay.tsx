'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type Landmark,
    type FormFeedback,
    type RepCounterState,
    getAnalyzerForExercise,
    createRepCounter,
    updateRepCounter,
} from '@/lib/formAnalysis';

// Landmark indices for the full body skeleton
const POSE_CONNECTIONS: [number, number][] = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    // Torso
    [11, 12], [11, 23], [12, 24], [23, 24],
    // Left arm
    [11, 13], [13, 15],
    // Right arm
    [12, 14], [14, 16],
    // Left leg
    [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Indices of all joints to draw as circles
const JOINT_INDICES = [
    0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
];

interface PoseDetectionOverlayProps {
    /** Whether the overlay is visible */
    visible: boolean;
    /** Called when user closes the overlay */
    onClose: () => void;
    /** Exercise name for exercise-specific form analysis */
    exerciseName?: string;
    /** Callback when rep count changes */
    onRepCount?: (count: number) => void;
}

type OverlayState = 'idle' | 'loading' | 'active' | 'error';

// Throttle feedback updates to avoid flicker
const FEEDBACK_UPDATE_INTERVAL_MS = 500;

export default function PoseDetectionOverlay({ visible, onClose, exerciseName, onRepCount }: PoseDetectionOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const landmarkerRef = useRef<import('@mediapipe/tasks-vision').PoseLandmarker | null>(null);
    const requestRef = useRef<number | null>(null);
    const runningRef = useRef(false);
    const lastTimestampRef = useRef(-1);

    const [overlayState, setOverlayState] = useState<OverlayState>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [feedbackCues, setFeedbackCues] = useState<FormFeedback[]>([]);
    const [repCount, setRepCount] = useState(0);

    // Mutable refs for high-frequency updates (avoid re-renders on every frame)
    const repCounterRef = useRef<RepCounterState>(createRepCounter());
    const lastFeedbackUpdateRef = useRef(0);
    const analyzerRef = useRef(getAnalyzerForExercise(exerciseName));

    // Update analyzer when exercise changes
    useEffect(() => {
        analyzerRef.current = getAnalyzerForExercise(exerciseName);
        repCounterRef.current = createRepCounter();
        setRepCount(0);
        setFeedbackCues([]);
    }, [exerciseName]);

    // Clean up function for camera and animation frame
    const cleanup = useCallback(() => {
        runningRef.current = false;
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        lastTimestampRef.current = -1;
    }, []);

    // Draw skeleton on canvas
    const drawSkeleton = useCallback((
        ctx: CanvasRenderingContext2D,
        landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>,
        width: number,
        height: number,
    ) => {
        ctx.clearRect(0, 0, width, height);

        // Draw connections (bones)
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
            const p1 = landmarks[startIdx];
            const p2 = landmarks[endIdx];
            if (!p1 || !p2) continue;

            const vis1 = p1.visibility ?? 1;
            const vis2 = p2.visibility ?? 1;
            if (vis1 < 0.3 || vis2 < 0.3) continue;

            const alpha = Math.min(vis1, vis2);
            ctx.strokeStyle = `rgba(57, 255, 20, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
        }

        // Draw joints
        for (const idx of JOINT_INDICES) {
            const p = landmarks[idx];
            if (!p) continue;

            const vis = p.visibility ?? 1;
            if (vis < 0.3) continue;

            ctx.fillStyle = `rgba(255, 255, 255, ${vis})`;
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Neon glow ring
            ctx.strokeStyle = `rgba(57, 255, 20, ${vis * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, 6, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }, []);

    // Process landmarks for form analysis and rep counting
    const processLandmarks = useCallback((landmarks: Landmark[]) => {
        const nowMs = performance.now();
        const analysis = analyzerRef.current(landmarks);

        // Update rep counter
        const newRepState = updateRepCounter(
            repCounterRef.current,
            analysis.repMetric,
            analysis.phase,
            nowMs,
        );

        if (newRepState.count !== repCounterRef.current.count) {
            repCounterRef.current = newRepState;
            setRepCount(newRepState.count);
            onRepCount?.(newRepState.count);
        } else {
            repCounterRef.current = newRepState;
        }

        // Throttle feedback updates
        if (nowMs - lastFeedbackUpdateRef.current >= FEEDBACK_UPDATE_INTERVAL_MS) {
            lastFeedbackUpdateRef.current = nowMs;
            if (analysis.feedback.length > 0) {
                setFeedbackCues(analysis.feedback);
            }
        }
    }, [onRepCount]);

    // Prediction loop
    const predictWebcam = useCallback(() => {
        if (!runningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const landmarker = landmarkerRef.current;

        if (!video || !canvas || !landmarker) {
            requestRef.current = requestAnimationFrame(predictWebcam);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas to match video dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
        } else {
            requestRef.current = requestAnimationFrame(predictWebcam);
            return;
        }

        const nowMs = performance.now();
        // Ensure timestamps are strictly increasing for MediaPipe
        if (nowMs <= lastTimestampRef.current) {
            requestRef.current = requestAnimationFrame(predictWebcam);
            return;
        }
        lastTimestampRef.current = nowMs;

        try {
            const result = landmarker.detectForVideo(video, nowMs);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0] as Landmark[];
                drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
                processLandmarks(landmarks);
            }
        } catch {
            // Continue the loop even if a frame fails
        }

        if (runningRef.current) {
            requestRef.current = requestAnimationFrame(predictWebcam);
        }
    }, [drawSkeleton, processLandmarks]);

    // Start camera and pose detection
    const startCamera = useCallback(async () => {
        setOverlayState('loading');
        setErrorMessage('');

        try {
            // Dynamically import MediaPipe to avoid SSR issues
            const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');

            // Initialize MediaPipe if not already done
            if (!landmarkerRef.current) {
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
                );
                landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
            }

            // Request camera with mobile-friendly constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => {
                    videoRef.current?.play();
                    runningRef.current = true;
                    lastTimestampRef.current = -1;
                    setOverlayState('active');
                    predictWebcam();
                };
            }
        } catch (err) {
            console.error('PoseDetection error:', err);
            const message =
                err instanceof DOMException && err.name === 'NotAllowedError'
                    ? 'Camera access denied. Please allow camera permissions.'
                    : err instanceof DOMException && err.name === 'NotFoundError'
                        ? 'No camera found on this device.'
                        : 'Failed to start pose detection. Please try again.';
            setErrorMessage(message);
            setOverlayState('error');
        }
    }, [predictWebcam]);

    // Auto-start camera when overlay becomes visible
    useEffect(() => {
        if (visible && overlayState === 'idle') {
            startCamera();
        }
    }, [visible, overlayState, startCamera]);

    // Cleanup when overlay is hidden or component unmounts
    useEffect(() => {
        if (!visible) {
            cleanup();
            setOverlayState('idle');
        }
        return () => {
            cleanup();
        };
    }, [visible, cleanup]);

    // Handle close
    const handleClose = useCallback(() => {
        cleanup();
        setOverlayState('idle');
        onClose();
    }, [cleanup, onClose]);

    if (!visible) return null;

    const severityColor = (severity: FormFeedback['severity']) => {
        switch (severity) {
            case 'good': return '#39ff14';
            case 'warning': return '#ffaa00';
            case 'error': return '#ef4444';
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                data-testid="pose-detection-overlay"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    marginBottom: '1rem',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#000',
                    border: '1px solid rgba(57, 255, 20, 0.3)',
                }}
            >
                {/* Close button */}
                <button
                    data-testid="pose-close-btn"
                    onClick={handleClose}
                    aria-label="Close pose detection"
                    style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        zIndex: 30,
                        background: 'rgba(0, 0, 0, 0.7)',
                        border: '1px solid rgba(57, 255, 20, 0.4)',
                        color: '#39ff14',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        lineHeight: 1,
                    }}
                >
                    X
                </button>

                {/* Video + Canvas container */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
                    <video
                        ref={videoRef}
                        data-testid="pose-video"
                        playsInline
                        muted
                        autoPlay
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)',
                        }}
                    />
                    <canvas
                        ref={canvasRef}
                        data-testid="pose-canvas"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: 'scaleX(-1)',
                            zIndex: 10,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Loading state */}
                    {overlayState === 'loading' && (
                        <div
                            data-testid="pose-loading"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 0, 0, 0.8)',
                                zIndex: 20,
                                gap: '0.75rem',
                            }}
                        >
                            <div className="spinner" />
                            <span style={{ color: '#39ff14', fontSize: '0.85rem' }}>
                                Loading pose detection...
                            </span>
                        </div>
                    )}

                    {/* Error state */}
                    {overlayState === 'error' && (
                        <div
                            data-testid="pose-error"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0, 0, 0, 0.85)',
                                zIndex: 20,
                                gap: '0.75rem',
                                padding: '1rem',
                                textAlign: 'center',
                            }}
                        >
                            <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                {errorMessage}
                            </span>
                            <button
                                onClick={startCamera}
                                style={{
                                    background: 'none',
                                    border: '1px solid rgba(57, 255, 20, 0.4)',
                                    color: '#39ff14',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Active indicator + Rep counter */}
                    {overlayState === 'active' && (
                        <>
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    zIndex: 25,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#39ff14',
                                        animation: 'pulse 2s infinite',
                                    }}
                                />
                                <span style={{ color: '#39ff14', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Form Check
                                </span>
                            </div>

                            {/* Rep counter badge */}
                            <div
                                data-testid="rep-counter"
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 25,
                                    background: 'rgba(0, 0, 0, 0.75)',
                                    border: '1px solid rgba(57, 255, 20, 0.5)',
                                    borderRadius: '12px',
                                    padding: '4px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span style={{ color: '#888', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Reps
                                </span>
                                <span
                                    data-testid="rep-count-value"
                                    style={{
                                        color: '#39ff14',
                                        fontSize: '1.1rem',
                                        fontFamily: 'var(--font-orbitron)',
                                        fontWeight: 700,
                                    }}
                                >
                                    {repCount}
                                </span>
                            </div>

                            {/* Form feedback cues */}
                            {feedbackCues.length > 0 && (
                                <div
                                    data-testid="form-feedback"
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '8px',
                                        right: '8px',
                                        zIndex: 25,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                    }}
                                >
                                    {feedbackCues.map((cue, i) => (
                                        <div
                                            key={`${cue.message}-${i}`}
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.75)',
                                                border: `1px solid ${severityColor(cue.severity)}40`,
                                                borderRadius: '8px',
                                                padding: '4px 10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: severityColor(cue.severity),
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span
                                                style={{
                                                    color: severityColor(cue.severity),
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {cue.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
