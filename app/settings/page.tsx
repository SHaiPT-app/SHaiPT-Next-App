'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings state
    const [workoutPrivacy, setWorkoutPrivacy] = useState<'public' | 'followers' | 'private'>('public');
    const [autoPostWorkouts, setAutoPostWorkouts] = useState(true);
    const [allowUnsolicitedMessages, setAllowUnsolicitedMessages] = useState(true);
    const [preferredWeightUnit, setPreferredWeightUnit] = useState<'lbs' | 'kg'>('lbs');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const profile = JSON.parse(storedUser);
            setUser(profile);

            // Set initial values from profile
            setWorkoutPrivacy(profile.workout_privacy || 'public');
            setAutoPostWorkouts(profile.auto_post_workouts !== false);
            setAllowUnsolicitedMessages(profile.allow_unsolicited_messages !== false);
            setPreferredWeightUnit(profile.preferred_weight_unit || 'lbs');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await db.profiles.update(user.id, {
                workout_privacy: workoutPrivacy,
                auto_post_workouts: autoPostWorkouts,
                allow_unsolicited_messages: allowUnsolicitedMessages,
                preferred_weight_unit: preferredWeightUnit
            });

            // Update localStorage
            const updatedUser = {
                ...user,
                workout_privacy: workoutPrivacy,
                auto_post_workouts: autoPostWorkouts,
                allow_unsolicited_messages: allowUnsolicitedMessages,
                preferred_weight_unit: preferredWeightUnit
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    ← Back
                </button>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    margin: 0,
                    color: 'var(--primary)'
                }}>
                    Settings
                </h1>
            </div>

            {/* Privacy Settings */}
            <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    Privacy
                </h2>

                {/* Workout Privacy */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Workout Privacy
                    </label>
                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Who can see your workout logs on the activity feed
                    </p>
                    <select
                        value={workoutPrivacy}
                        onChange={(e) => setWorkoutPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                        className="input-field"
                    >
                        <option value="public">Public - Everyone can see</option>
                        <option value="followers">Followers Only</option>
                        <option value="private">Private - Only me</option>
                    </select>
                </div>

                {/* Auto-post Workouts */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={autoPostWorkouts}
                            onChange={(e) => setAutoPostWorkouts(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <div style={{ fontWeight: '500' }}>Auto-post Workouts</div>
                            <div style={{ color: '#888', fontSize: '0.85rem' }}>
                                Automatically share completed workouts to activity feed
                            </div>
                        </div>
                    </label>
                </div>

                {/* Allow Unsolicited Messages */}
                <div>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={allowUnsolicitedMessages}
                            onChange={(e) => setAllowUnsolicitedMessages(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div>
                            <div style={{ fontWeight: '500' }}>Allow Direct Messages</div>
                            <div style={{ color: '#888', fontSize: '0.85rem' }}>
                                Let anyone send you direct messages
                            </div>
                        </div>
                    </label>
                </div>
            </section>

            {/* Preferences */}
            <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.25rem',
                    marginBottom: '1.5rem'
                }}>
                    Preferences
                </h2>

                {/* Weight Unit */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Preferred Weight Unit
                    </label>
                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Default unit for logging weights
                    </p>
                    <select
                        value={preferredWeightUnit}
                        onChange={(e) => setPreferredWeightUnit(e.target.value as 'lbs' | 'kg')}
                        className="input-field"
                    >
                        <option value="lbs">Pounds (lbs)</option>
                        <option value="kg">Kilograms (kg)</option>
                    </select>
                </div>
            </section>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{ width: '100%' }}
            >
                {saving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    );
}
