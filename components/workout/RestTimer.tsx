'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Plus, Minus, Volume2, VolumeX } from 'lucide-react';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

interface RestTimerProps {
    onComplete?: () => void;
    compact?: boolean;
}

export function RestTimer({ onComplete, compact = false }: RestTimerProps) {
    const { timer, startRestTimer, pauseRestTimer, resumeRestTimer, skipRestTimer, tickRestTimer } = useWorkoutStore();
    const { preferences } = useUserPreferencesStore();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Format time as mm:ss
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const progress = timer.totalRestSeconds > 0
        ? ((timer.totalRestSeconds - timer.restSecondsRemaining) / timer.totalRestSeconds) * 100
        : 0;

    // Handle timer tick
    useEffect(() => {
        if (timer.isResting && timer.restSecondsRemaining > 0) {
            intervalRef.current = setInterval(() => {
                tickRestTimer();
            }, 1000);
        } else if (timer.restSecondsRemaining <= 0 && timer.isResting) {
            // Timer complete
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            playAlert();
            onComplete?.();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timer.isResting, timer.restSecondsRemaining, tickRestTimer, onComplete]);

    // Play alert sound/vibration
    const playAlert = useCallback(() => {
        const alertType = preferences?.rest_timer_alert_type || 'both';

        if (alertType === 'audio' || alertType === 'both') {
            // Play a tone
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (e) {
                console.log('Audio not available');
            }
        }

        if (alertType === 'vibration' || alertType === 'both') {
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    }, [preferences?.rest_timer_alert_type]);

    // Quick adjust time
    const adjustTime = (delta: number) => {
        const newTime = Math.max(0, timer.restSecondsRemaining + delta);
        startRestTimer(newTime);
        if (timer.isResting) {
            resumeRestTimer();
        }
    };

    // Preset times
    const presets = [30, 60, 90, 120, 180];

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                {timer.isResting ? (
                    <>
                        <div className="relative w-12 h-12">
                            <svg className="w-12 h-12 -rotate-90">
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="#374151"
                                    strokeWidth="4"
                                />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="#06b6d4"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={125.6}
                                    strokeDashoffset={125.6 * (1 - progress / 100)}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white">
                                {formatTime(timer.restSecondsRemaining)}
                            </span>
                        </div>
                        <button
                            onClick={skipRestTimer}
                            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                        >
                            <SkipForward className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => startRestTimer(preferences?.default_rest_seconds || 90)}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-sm"
                    >
                        Start Rest
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Rest Timer</h3>
                {timer.isResting && (
                    <span className="text-xs text-cyan-400">
                        {timer.isResting ? 'Resting...' : 'Ready'}
                    </span>
                )}
            </div>

            {/* Timer Circle */}
            <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="#1f2937"
                            strokeWidth="8"
                        />
                        <motion.circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={351.86}
                            strokeDashoffset={351.86 * (1 - progress / 100)}
                            initial={false}
                            animate={{ strokeDashoffset: 351.86 * (1 - progress / 100) }}
                            transition={{ duration: 0.5 }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-mono font-bold text-white">
                            {formatTime(timer.restSecondsRemaining)}
                        </span>
                        <span className="text-xs text-gray-500">
                            of {formatTime(timer.totalRestSeconds)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Adjust */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <button
                    onClick={() => adjustTime(-15)}
                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500 w-12 text-center">15s</span>
                <button
                    onClick={() => adjustTime(15)}
                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-4">
                {timer.isResting ? (
                    <>
                        <button
                            onClick={pauseRestTimer}
                            className="p-3 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                            <Pause className="w-5 h-5" />
                        </button>
                        <button
                            onClick={skipRestTimer}
                            className="p-3 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        >
                            <SkipForward className="w-5 h-5" />
                        </button>
                    </>
                ) : timer.restSecondsRemaining > 0 ? (
                    <button
                        onClick={resumeRestTimer}
                        className="p-3 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                        <Play className="w-5 h-5" />
                    </button>
                ) : null}
            </div>

            {/* Presets */}
            <div className="flex items-center justify-center gap-2">
                {presets.map((seconds) => (
                    <button
                        key={seconds}
                        onClick={() => startRestTimer(seconds)}
                        className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${timer.totalRestSeconds === seconds
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                            }
                        `}
                    >
                        {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default RestTimer;
