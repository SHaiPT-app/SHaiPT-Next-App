'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { useWorkoutStore } from '@/stores/workoutStore';

interface UseScreenWakeOptions {
    enabled?: boolean;
}

export function useScreenWake(options: UseScreenWakeOptions = {}) {
    const { enabled: enabledOption } = options;
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { preferences } = useUserPreferencesStore();
    const { workout } = useWorkoutStore();

    // Determine if wake lock should be enabled
    const shouldEnable = enabledOption ??
        (preferences?.screen_awake_during_workout && workout.isActive);

    // Check for Wake Lock API support
    useEffect(() => {
        setIsSupported('wakeLock' in navigator);
    }, []);

    // Request wake lock
    const requestWakeLock = useCallback(async () => {
        if (!isSupported) {
            setError('Wake Lock API not supported');
            return false;
        }

        try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            setIsActive(true);
            setError(null);

            // Listen for release
            wakeLockRef.current.addEventListener('release', () => {
                setIsActive(false);
            });

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to request wake lock';
            setError(message);
            setIsActive(false);
            return false;
        }
    }, [isSupported]);

    // Release wake lock
    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
                setIsActive(false);
            } catch (err) {
                console.error('Failed to release wake lock:', err);
            }
        }
    }, []);

    // Auto-manage wake lock based on shouldEnable
    useEffect(() => {
        if (shouldEnable && !isActive) {
            requestWakeLock();
        } else if (!shouldEnable && isActive) {
            releaseWakeLock();
        }

        return () => {
            releaseWakeLock();
        };
    }, [shouldEnable, isActive, requestWakeLock, releaseWakeLock]);

    // Re-request wake lock when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && shouldEnable) {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [shouldEnable, requestWakeLock]);

    return {
        isSupported,
        isActive,
        error,
        request: requestWakeLock,
        release: releaseWakeLock,
    };
}

export default useScreenWake;
