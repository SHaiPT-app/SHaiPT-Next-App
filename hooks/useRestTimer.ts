'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

interface UseRestTimerOptions {
    onComplete?: () => void;
    onTick?: (secondsRemaining: number) => void;
}

export function useRestTimer(options: UseRestTimerOptions = {}) {
    const { onComplete, onTick } = options;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const {
        timer,
        startRestTimer,
        pauseRestTimer,
        resumeRestTimer,
        skipRestTimer,
        tickRestTimer,
        setAutoStartTimer,
    } = useWorkoutStore();

    const { preferences } = useUserPreferencesStore();

    // Handle timer tick
    useEffect(() => {
        if (timer.isResting && timer.restSecondsRemaining > 0) {
            intervalRef.current = setInterval(() => {
                tickRestTimer();
                onTick?.(timer.restSecondsRemaining - 1);
            }, 1000);
        } else if (timer.isResting && timer.restSecondsRemaining <= 0) {
            // Timer complete
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            playAlertSound();
            onComplete?.();
            skipRestTimer(); // Reset timer state
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timer.isResting, timer.restSecondsRemaining, tickRestTimer, onComplete, onTick, skipRestTimer]);

    // Play alert based on preferences
    const playAlertSound = useCallback(() => {
        const alertType = preferences?.rest_timer_alert_type || 'both';

        if (alertType === 'audio' || alertType === 'both') {
            playBeep();
        }

        if (alertType === 'vibration' || alertType === 'both') {
            vibrate();
        }
    }, [preferences?.rest_timer_alert_type]);

    // Play beep sound
    const playBeep = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();

            // Play pattern: beep-beep-beep
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.45);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.6);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.75);

            oscillator.stop(audioContext.currentTime + 0.75);
        } catch (error) {
            console.log('Audio not available');
        }
    }, []);

    // Vibrate device
    const vibrate = useCallback(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }, []);

    // Start timer with custom or default duration
    const start = useCallback((seconds?: number) => {
        const duration = seconds ?? preferences?.default_rest_seconds ?? 90;
        startRestTimer(duration);
    }, [startRestTimer, preferences?.default_rest_seconds]);

    // Adjust time (add or subtract seconds)
    const adjustTime = useCallback((delta: number) => {
        const newTime = Math.max(0, timer.restSecondsRemaining + delta);
        startRestTimer(newTime);
        if (timer.isResting) {
            resumeRestTimer();
        }
    }, [timer.restSecondsRemaining, timer.isResting, startRestTimer, resumeRestTimer]);

    // Format time as mm:ss
    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Calculate progress percentage
    const progress = timer.totalRestSeconds > 0
        ? ((timer.totalRestSeconds - timer.restSecondsRemaining) / timer.totalRestSeconds) * 100
        : 0;

    return {
        isResting: timer.isResting,
        secondsRemaining: timer.restSecondsRemaining,
        totalSeconds: timer.totalRestSeconds,
        progress,
        formattedTime: formatTime(timer.restSecondsRemaining),
        autoStart: timer.autoStart,

        start,
        pause: pauseRestTimer,
        resume: resumeRestTimer,
        skip: skipRestTimer,
        adjustTime,
        setAutoStart: setAutoStartTimer,
        playAlertSound,
    };
}

export default useRestTimer;
