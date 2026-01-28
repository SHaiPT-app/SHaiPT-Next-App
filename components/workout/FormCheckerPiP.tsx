'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video,
    VideoOff,
    Camera,
    X,
    Maximize2,
    Minimize2,
    Move,
} from 'lucide-react';

interface FormCheckerPiPProps {
    isVisible: boolean;
    onClose: () => void;
    onToggleRecording?: (isRecording: boolean) => void;
}

type PiPPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function FormCheckerPiP({
    isVisible,
    onClose,
    onToggleRecording,
}: FormCheckerPiPProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [isMinimized, setIsMinimized] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [hasCamera, setHasCamera] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [position, setPosition] = useState<PiPPosition>('bottom-right');

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 480 },
                    height: { ideal: 640 },
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setHasCamera(true);
            setError(null);
        } catch (err) {
            console.error('Camera error:', err);
            setHasCamera(false);
            setError('Unable to access camera');
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // Start/stop camera based on visibility
    useEffect(() => {
        if (isVisible) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isVisible, startCamera, stopCamera]);

    // Toggle recording
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            onToggleRecording?.(false);
        } else {
            // Start recording
            if (!streamRef.current) return;

            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'video/webm',
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                // TODO: Save or upload the video
                console.log('Recording saved:', blob.size, 'bytes');
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            onToggleRecording?.(true);
        }
    }, [isRecording, onToggleRecording]);

    // Cycle through positions
    const cyclePosition = () => {
        const positions: PiPPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const currentIndex = positions.indexOf(position);
        const nextIndex = (currentIndex + 1) % positions.length;
        setPosition(positions[nextIndex]);
    };

    // Get position classes
    const getPositionClasses = (): string => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-20 left-4';
            case 'bottom-right':
            default:
                return 'bottom-20 right-4';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`fixed z-40 ${getPositionClasses()}`}
                >
                    <div
                        className={`
                            relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50
                            border border-gray-700 bg-gray-900
                            ${isMinimized ? 'w-16 h-16' : 'w-36 h-48 sm:w-48 sm:h-64'}
                            transition-all duration-300
                        `}
                    >
                        {/* Video Feed */}
                        {hasCamera ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${isMinimized ? 'hidden' : ''}`}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <VideoOff className="w-8 h-8 text-gray-600" />
                            </div>
                        )}

                        {/* Minimized State */}
                        {isMinimized && (
                            <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-6 h-6 text-cyan-400" />
                            </div>
                        )}

                        {/* Recording Indicator */}
                        {isRecording && !isMinimized && (
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-red-500/80 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-xs text-white font-medium">REC</span>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="flex items-center justify-between">
                                {/* Position Toggle */}
                                <button
                                    onClick={cyclePosition}
                                    className="p-1.5 rounded-full bg-gray-800/80 text-gray-400 hover:text-white"
                                >
                                    <Move className="w-4 h-4" />
                                </button>

                                {/* Record Button */}
                                {!isMinimized && hasCamera && (
                                    <button
                                        onClick={toggleRecording}
                                        className={`
                                            p-2 rounded-full transition-colors
                                            ${isRecording
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-800/80 text-gray-400 hover:text-white'
                                            }
                                        `}
                                    >
                                        <Video className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Minimize/Maximize */}
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1.5 rounded-full bg-gray-800/80 text-gray-400 hover:text-white"
                                >
                                    {isMinimized ? (
                                        <Maximize2 className="w-4 h-4" />
                                    ) : (
                                        <Minimize2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/80 text-gray-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default FormCheckerPiP;
