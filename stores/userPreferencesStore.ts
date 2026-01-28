import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPreferences, RestTimerAlertType } from '@/lib/types';

interface UserPreferencesStore {
    preferences: UserPreferences | null;
    isLoaded: boolean;

    // Actions
    setPreferences: (preferences: UserPreferences) => void;
    updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
    toggleFormChecker: () => void;
    toggleRestTimerAutoStart: () => void;
    setRestTimerAlertType: (type: RestTimerAlertType) => void;
    setDefaultRestSeconds: (seconds: number) => void;
    toggleScreenAwake: () => void;
    resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
    user_id: '',
    form_checker_enabled: false,
    rest_timer_auto_start: true,
    rest_timer_alert_type: 'both',
    default_rest_seconds: 90,
    screen_awake_during_workout: true,
};

export const useUserPreferencesStore = create<UserPreferencesStore>()(
    persist(
        (set, get) => ({
            preferences: null,
            isLoaded: false,

            setPreferences: (preferences) => {
                set({ preferences, isLoaded: true });
            },

            updatePreference: (key, value) => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: { ...preferences, [key]: value },
                    });
                }
            },

            toggleFormChecker: () => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: {
                            ...preferences,
                            form_checker_enabled: !preferences.form_checker_enabled,
                        },
                    });
                }
            },

            toggleRestTimerAutoStart: () => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: {
                            ...preferences,
                            rest_timer_auto_start: !preferences.rest_timer_auto_start,
                        },
                    });
                }
            },

            setRestTimerAlertType: (type) => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: { ...preferences, rest_timer_alert_type: type },
                    });
                }
            },

            setDefaultRestSeconds: (seconds) => {
                const { preferences } = get();
                if (preferences) {
                    // Clamp between 15 seconds and 10 minutes
                    const clamped = Math.max(15, Math.min(600, seconds));
                    set({
                        preferences: { ...preferences, default_rest_seconds: clamped },
                    });
                }
            },

            toggleScreenAwake: () => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: {
                            ...preferences,
                            screen_awake_during_workout: !preferences.screen_awake_during_workout,
                        },
                    });
                }
            },

            resetPreferences: () => {
                const { preferences } = get();
                if (preferences) {
                    set({
                        preferences: { ...defaultPreferences, user_id: preferences.user_id },
                    });
                }
            },
        }),
        {
            name: 'shaipt-user-preferences',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined') {
                    return localStorage;
                }
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                };
            }),
        }
    )
);

// Helper to get preferences with defaults
export const getPreferencesWithDefaults = (): UserPreferences => {
    const { preferences } = useUserPreferencesStore.getState();
    return preferences || defaultPreferences;
};
