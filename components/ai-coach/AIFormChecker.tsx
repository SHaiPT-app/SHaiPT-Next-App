
'use client';

import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export default function AIFormChecker() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [running, setRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [leftAngle, setLeftAngle] = useState(0);
    const [rightAngle, setRightAngle] = useState(0);

    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const requestRef = useRef<number | null>(null);
    const runningRef = useRef(false);

    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                setLoading(true);
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
                );
                landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
                setLoading(false);
                console.log('MediaPipe initialized successfully');
            } catch (err) {
                console.error('MediaPipe init error:', err);
                setError('Failed to load AI model');
                setLoading(false);
            }
        };

        initMediaPipe();

        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        if (!landmarkerRef.current) {
            console.error('Landmarker not ready');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for data to load before starting prediction loop
                videoRef.current.onloadeddata = () => {
                    console.log('Video data loaded, starting prediction loop');
                    videoRef.current?.play();
                    runningRef.current = true;
                    setRunning(true);
                    setError(null);
                    predictWebcam();
                };
            }
        } catch (err) {
            console.error('Camera start error:', err);
            setError('Failed to access camera. Please allow camera access.');
        }
    };

    const stopCamera = () => {
        runningRef.current = false;
        setRunning(false);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
    };

    const predictWebcam = async () => {
        if (!runningRef.current) return;

        if (!videoRef.current || !canvasRef.current || !landmarkerRef.current) {
            // Only log periodically or once to avoid spam, or just return
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Resize canvas to match video
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                console.log(`Resizing canvas to ${video.videoWidth}x${video.videoHeight}`);
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
        } else {
            requestRef.current = requestAnimationFrame(predictWebcam);
            return;
        }

        const startTimeMs = performance.now();
        let result;
        try {
            result = await landmarkerRef.current.detectForVideo(video, startTimeMs);
        } catch (e) {
            console.error('Detection error:', e);
            // Continue loop even if one frame fails
            requestRef.current = requestAnimationFrame(predictWebcam);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.landmarks && result.landmarks.length > 0) {
            // console.log('Landmarks detected:', result.landmarks[0].length);
            const landmarks = result.landmarks[0];
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
            calculateMetrics(landmarks);
        } else {
            // console.log('No landmarks detected');
        }

        if (runningRef.current) {
            requestRef.current = requestAnimationFrame(predictWebcam);
        }
    };

    const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
        // Simple skeleton drawing
        const connections = [
            [11, 13], [13, 15], // Left arm
            [12, 14], [14, 16], // Right arm
            [11, 12], // Shoulders
            [11, 23], [12, 24], // Torso
            [23, 24] // Hips
        ];

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00ff00';

        connections.forEach(([start, end]) => {
            const p1 = landmarks[start];
            const p2 = landmarks[end];
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x * width, p1.y * height);
                ctx.lineTo(p2.x * width, p2.y * height);
                ctx.stroke();
            }
        });

        // Draw points
        ctx.fillStyle = '#ff0000';
        [11, 12, 13, 14, 15, 16, 23, 24].forEach(idx => {
            const p = landmarks[idx];
            if (p) {
                ctx.beginPath();
                ctx.arc(p.x * width, p.y * height, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    };

    const calculateMetrics = (landmarks: any[]) => {
        // Calculate elbow angles for bench press form (simplified)
        // 11: left shoulder, 13: left elbow, 23: left hip
        // 12: right shoulder, 14: right elbow, 24: right hip

        const angle = (p1: any, p2: any, p3: any) => {
            if (!p1 || !p2 || !p3) return 0;
            const a = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
            const b = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
            const c = Math.sqrt(Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2));
            return Math.acos((a * a + b * b - c * c) / (2 * a * b)) * (180 / Math.PI);
        };

        const lAngle = angle(landmarks[11], landmarks[13], landmarks[23]); // Shoulder-Elbow-Hip is not quite right for bench press flare, but using the reference logic
        // The reference code used vector math for angle between (Elbow-Shoulder) and (Hip-Shoulder) vectors
        // Let's approximate using simple 3-point angle for now or replicate the vector math if critical.
        // Replicating vector math from reference:

        const angleBetween = (v1: number[], v2: number[]) => {
            const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
            const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
            if (mag1 === 0 || mag2 === 0) return 0;
            const dot = v1[0] * v2[0] + v1[1] * v2[1];
            return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
        };

        const getVector = (p1: any, p2: any) => [p2.x - p1.x, p2.y - p1.y];

        const lVec1 = getVector(landmarks[11], landmarks[13]); // Shoulder to Elbow
        const lVec2 = getVector(landmarks[11], landmarks[23]); // Shoulder to Hip
        const lAng = angleBetween(lVec1, lVec2);

        const rVec1 = getVector(landmarks[12], landmarks[14]); // Shoulder to Elbow
        const rVec2 = getVector(landmarks[12], landmarks[24]); // Shoulder to Hip
        const rAng = angleBetween(rVec1, rVec2);

        setLeftAngle(Math.round(lAng));
        setRightAngle(Math.round(rAng));

        // Score logic (45-60 degrees is ideal)
        const scoreAngle = (a: number) => {
            if (a >= 45 && a <= 60) return 100;
            const diff = a < 45 ? 45 - a : a - 60;
            return Math.max(0, 100 - diff * 3);
        };

        setScore(Math.round((scoreAngle(lAng) + scoreAngle(rAng)) / 2));
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>AI Form Checker (Bench Press)</h2>

            {error && (
                <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid red', color: 'red', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#222', borderRadius: '4px', fontSize: '0.8rem', color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    Status: {loading ? 'Loading Model...' : landmarkerRef.current ? 'Model Ready' : 'Initializing...'} |
                    Camera: {running ? 'Active' : 'Inactive'}
                </div>
                <button
                    onClick={() => {
                        console.log('Diagnostics:', {
                            videoRef: !!videoRef.current,
                            canvasRef: !!canvasRef.current,
                            landmarker: !!landmarkerRef.current,
                            running,
                            videoReadyState: videoRef.current?.readyState,
                            videoSize: videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'N/A'
                        });
                        alert('Diagnostics logged to console');
                    }}
                    style={{ background: '#444', border: 'none', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Run Diagnostics
                </button>
            </div>

            <div style={{ position: 'relative', aspectRatio: '16/9', background: 'black', borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem' }}>
                <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }}
                    playsInline
                    muted
                    autoPlay
                />
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', zIndex: 10, pointerEvents: 'none' }}
                />

                {!running && !loading && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                        <button
                            onClick={startCamera}
                            style={{ background: 'var(--accent)', color: 'white', padding: '1rem 2rem', borderRadius: '8px', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                        >
                            Start Camera
                        </button>
                    </div>
                )}

                {loading && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                        Loading AI Model...
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Overall Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: score > 80 ? 'var(--accent)' : score > 50 ? 'orange' : 'red' }}>{score}%</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Left Angle</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{leftAngle}°</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Target: 45-60°</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Right Angle</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{rightAngle}°</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Target: 45-60°</div>
                </div>
            </div>

            {running && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        onClick={stopCamera}
                        style={{ background: '#333', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #555', cursor: 'pointer' }}
                    >
                        Stop Camera
                    </button>
                </div>
            )}
        </div>
    );
}
