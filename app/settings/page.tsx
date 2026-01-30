'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';
import type { Profile, IntakeFormData } from '@/lib/types';
import { Check, Pencil, X, Camera } from 'lucide-react';

type SettingsTab = 'personal' | 'training' | 'medical' | 'photos';

const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'training', label: 'Training' },
    { id: 'medical', label: 'Medical' },
    { id: 'photos', label: 'Photos' },
];

interface EditableFieldProps {
    label: string;
    value: string;
    onSave: (value: string) => void;
    readOnly?: boolean;
    multiline?: boolean;
}

function EditableField({ label, value, onSave, readOnly = false, multiline = false }: EditableFieldProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const handleSave = () => {
        onSave(draft);
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft(value);
        setEditing(false);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '0.65rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: '500', marginBottom: '0.2rem' }}>
                    {label}
                </div>
                {editing ? (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                        {multiline ? (
                            <textarea
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                rows={3}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--neon-orange)',
                                    borderRadius: '6px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                }}
                            />
                        ) : (
                            <input
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--neon-orange)',
                                    borderRadius: '6px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                }}
                            />
                        )}
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '0.4rem',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '6px',
                                color: '#10b981',
                                cursor: 'pointer',
                            }}
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '0.4rem',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: '#888',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.85rem', color: value ? 'var(--foreground)' : '#555' }}>
                        {value || '-- Not set --'}
                    </div>
                )}
            </div>
            {!editing && !readOnly && (
                <button
                    onClick={() => setEditing(true)}
                    style={{
                        padding: '0.35rem',
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        marginTop: '0.2rem',
                    }}
                >
                    <Pencil size={14} />
                </button>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('personal');

    // Settings state
    const [workoutPrivacy, setWorkoutPrivacy] = useState<'public' | 'followers' | 'private'>('public');
    const [autoPostWorkouts, setAutoPostWorkouts] = useState(true);
    const [allowUnsolicitedMessages, setAllowUnsolicitedMessages] = useState(true);
    const [preferredWeightUnit, setPreferredWeightUnit] = useState<'lbs' | 'kg'>('lbs');

    // Profile / intake data
    const [intakeData, setIntakeData] = useState<IntakeFormData | null>(null);
    const [profilePhotos, setProfilePhotos] = useState<string[]>([]);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const profile = JSON.parse(storedUser);
            setUser(profile);
            setWorkoutPrivacy(profile.workout_privacy || 'public');
            setAutoPostWorkouts(profile.auto_post_workouts !== false);
            setAllowUnsolicitedMessages(profile.allow_unsolicited_messages !== false);
            setPreferredWeightUnit(profile.preferred_weight_unit || 'lbs');
        }

        // Load intake data from latest coach interview
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: interview } = await supabase
                    .from('coach_interviews')
                    .select('intake_data')
                    .eq('user_id', authUser.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (interview?.intake_data) {
                    setIntakeData(interview.intake_data as IntakeFormData);
                }

                // Load progress photos
                const { data: media } = await supabase
                    .from('progress_media')
                    .select('storage_path')
                    .eq('user_id', authUser.id)
                    .eq('media_type', 'image')
                    .order('created_at', { ascending: false })
                    .limit(9);

                if (media) {
                    setProfilePhotos(media.map(m => m.storage_path));
                }
            }
        } catch {
            // Not critical
        }

        setLoading(false);
    };

    const updateIntakeField = useCallback((field: keyof IntakeFormData, value: string) => {
        setIntakeData(prev => prev ? { ...prev, [field]: value } : null);
    }, []);

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await db.profiles.update(user.id, {
                workout_privacy: workoutPrivacy,
                auto_post_workouts: autoPostWorkouts,
                allow_unsolicited_messages: allowUnsolicitedMessages,
                preferred_weight_unit: preferredWeightUnit,
            });

            // Save intake data if changed
            if (intakeData) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    await supabase
                        .from('coach_interviews')
                        .update({ intake_data: intakeData, updated_at: new Date().toISOString() })
                        .eq('user_id', authUser.id)
                        .order('updated_at', { ascending: false })
                        .limit(1);
                }
            }

            const updatedUser = {
                ...user,
                workout_privacy: workoutPrivacy,
                auto_post_workouts: autoPostWorkouts,
                allow_unsolicited_messages: allowUnsolicitedMessages,
                preferred_weight_unit: preferredWeightUnit,
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
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
                minHeight: '100vh',
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    &larr; Back
                </button>
                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '2rem',
                    margin: 0,
                    color: 'var(--primary)',
                }}>
                    Settings
                </h1>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0',
                marginBottom: '1.5rem',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            padding: '0.6rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: activeTab === tab.id ? 'var(--neon-orange)' : 'rgba(255, 255, 255, 0.03)',
                            color: activeTab === tab.id ? '#0B0B15' : '#888',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-orbitron)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
                <>
                    {/* Profile fields from intake */}
                    <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-orbitron)',
                            fontSize: '1rem',
                            marginBottom: '0.75rem',
                            color: 'var(--neon-orange)',
                        }}>
                            Profile
                        </h2>
                        <EditableField
                            label="Full Name"
                            value={intakeData?.name || user?.full_name || ''}
                            onSave={v => updateIntakeField('name', v)}
                        />
                        <EditableField
                            label="Age"
                            value={intakeData?.age || ''}
                            onSave={v => updateIntakeField('age', v)}
                        />
                        <EditableField
                            label="Height"
                            value={intakeData?.height || ''}
                            onSave={v => updateIntakeField('height', v)}
                        />
                        <EditableField
                            label="Weight"
                            value={intakeData?.weight || ''}
                            onSave={v => updateIntakeField('weight', v)}
                        />
                    </section>

                    {/* Privacy Settings */}
                    <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-orbitron)',
                            fontSize: '1rem',
                            marginBottom: '1rem',
                        }}>
                            Privacy
                        </h2>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '500', fontSize: '0.85rem' }}>
                                Workout Privacy
                            </label>
                            <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
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
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={autoPostWorkouts}
                                    onChange={(e) => setAutoPostWorkouts(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>Auto-post Workouts</div>
                                    <div style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Automatically share completed workouts to activity feed
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={allowUnsolicitedMessages}
                                    onChange={(e) => setAllowUnsolicitedMessages(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <div>
                                    <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>Allow Direct Messages</div>
                                    <div style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Let anyone send you direct messages
                                    </div>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                        <h2 style={{
                            fontFamily: 'var(--font-orbitron)',
                            fontSize: '1rem',
                            marginBottom: '1rem',
                        }}>
                            Preferences
                        </h2>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: '500', fontSize: '0.85rem' }}>
                                Preferred Weight Unit
                            </label>
                            <p style={{ color: '#888', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
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
                </>
            )}

            {/* Training Tab */}
            {activeTab === 'training' && (
                <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1rem',
                        marginBottom: '0.75rem',
                        color: 'var(--neon-orange)',
                    }}>
                        Training Preferences
                    </h2>
                    <EditableField
                        label="Fitness Goals"
                        value={intakeData?.fitness_goals || ''}
                        onSave={v => updateIntakeField('fitness_goals', v)}
                        multiline
                    />
                    <EditableField
                        label="Training Days/Week"
                        value={intakeData?.training_days_per_week || ''}
                        onSave={v => updateIntakeField('training_days_per_week', v)}
                    />
                    <EditableField
                        label="Session Duration"
                        value={intakeData?.session_duration || ''}
                        onSave={v => updateIntakeField('session_duration', v)}
                    />
                    <EditableField
                        label="Preferred Time"
                        value={intakeData?.preferred_time || ''}
                        onSave={v => updateIntakeField('preferred_time', v)}
                    />
                    <EditableField
                        label="Available Equipment"
                        value={intakeData?.available_equipment || ''}
                        onSave={v => updateIntakeField('available_equipment', v)}
                        multiline
                    />
                    <EditableField
                        label="Training Location"
                        value={intakeData?.training_location || ''}
                        onSave={v => updateIntakeField('training_location', v)}
                    />
                    <EditableField
                        label="Fitness Level"
                        value={intakeData?.fitness_level || ''}
                        onSave={v => updateIntakeField('fitness_level', v)}
                    />
                    <EditableField
                        label="Athletic History"
                        value={intakeData?.sport_history || ''}
                        onSave={v => updateIntakeField('sport_history', v)}
                        multiline
                    />
                </section>
            )}

            {/* Medical Tab */}
            {activeTab === 'medical' && (
                <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1rem',
                        marginBottom: '0.75rem',
                        color: 'var(--neon-orange)',
                    }}>
                        Medical History
                    </h2>
                    <EditableField
                        label="Injuries / Limitations"
                        value={intakeData?.injuries || ''}
                        onSave={v => updateIntakeField('injuries', v)}
                        multiline
                    />
                    <EditableField
                        label="Medical Considerations"
                        value={intakeData?.medical_considerations || ''}
                        onSave={v => updateIntakeField('medical_considerations', v)}
                        multiline
                    />
                </section>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
                <section className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1rem',
                        marginBottom: '0.75rem',
                        color: 'var(--neon-orange)',
                    }}>
                        Physique Photos
                    </h2>
                    {profilePhotos.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                        }}>
                            {profilePhotos.map((path, i) => (
                                <div
                                    key={i}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                    }}
                                >
                                    <img
                                        src={path}
                                        alt={`Physique photo ${i + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            No physique photos uploaded yet. Upload them during a coach interview or use the button below.
                        </p>
                    )}
                    <button
                        onClick={() => router.push('/coach')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 1.25rem',
                            background: 'rgba(255, 102, 0, 0.15)',
                            border: '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--neon-orange)',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        <Camera size={16} />
                        Upload Photos via Coach Interview
                    </button>
                </section>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{ width: '100%' }}
            >
                {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {/* Success Toast */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '50px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    zIndex: 2000,
                    animation: 'fadeIn 0.3s ease-out',
                }}>
                    <Check size={18} />
                    <span style={{ fontWeight: '500' }}>Settings saved successfully!</span>
                </div>
            )}
        </div>
    );
}
