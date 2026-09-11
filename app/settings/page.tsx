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
        <div className="flex items-start justify-between border-b border-[var(--line-soft)] py-2.5">
            <div className="flex-1">
                <div className="mb-1 text-[0.72rem] font-medium text-ink-low">
                    {label}
                </div>
                {editing ? (
                    <div className="flex items-start gap-1.5">
                        {multiline ? (
                            <textarea
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                rows={3}
                                autoFocus
                                className="min-w-0 flex-1 resize-y rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-[0.85rem] text-ink-hi placeholder:text-ink-low outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                            />
                        ) : (
                            <input
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                autoFocus
                                className="min-w-0 flex-1 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-[0.85rem] text-ink-hi placeholder:text-ink-low outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                            />
                        )}
                        <button
                            onClick={handleSave}
                            className="cursor-pointer rounded-lg border border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_15%,transparent)] p-2 text-[var(--success)] transition-colors hover:bg-[color-mix(in_srgb,var(--success)_25%,transparent)]"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="cursor-pointer rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] p-2 text-ink-mid transition-colors hover:text-ink-hi"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className={`text-[0.85rem] ${value ? 'text-ink-hi' : 'text-ink-low'}`}>
                        {value || '-- Not set --'}
                    </div>
                )}
            </div>
            {!editing && !readOnly && (
                <button
                    onClick={() => setEditing(true)}
                    className="mt-0.5 cursor-pointer bg-transparent p-1.5 text-ink-low transition-colors hover:text-brand"
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

    const [gender, setGender] = useState<string>('');

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
            /* Match the column defaults (0001_base: "private by default ... unless they opt in").
               This reads a cached profile out of localStorage, so these fields are routinely
               absent — and a missing value used to fall through to public/auto-post, which the
               next Save then wrote back to the database. Opening Settings silently published
               your logs. An absent value means the user has not opted in. */
            setWorkoutPrivacy(profile.workout_privacy || 'private');
            setAutoPostWorkouts(profile.auto_post_workouts === true);
            setAllowUnsolicitedMessages(profile.allow_unsolicited_messages !== false);
            setPreferredWeightUnit(profile.preferred_weight_unit || 'lbs');
            setGender(profile.gender || '');
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
                    .maybeSingle();

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
                gender: gender || undefined,
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
                gender: gender || undefined,
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
            <div className="flex min-h-screen items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[600px] p-6 pb-8">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="cursor-pointer bg-transparent text-sm text-brand transition-colors hover:text-brand-hot"
                >
                    &larr; Back
                </button>
                <h1 className="display text-gradient-brand m-0 text-[2rem]">
                    Settings
                </h1>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`font-display flex-1 cursor-pointer rounded-lg px-2 py-2.5 text-[0.72rem] font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-brand text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                                : 'bg-transparent text-ink-mid hover:text-ink-hi'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
                <>
                    {/* Profile fields from intake */}
                    <section className="glass-card mb-6 px-5 py-4">
                        <h2 className="eyebrow mb-3">
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

                        {/* Gender */}
                        <div className="flex items-center justify-between border-b border-[var(--line-soft)] py-2.5">
                            <div>
                                <div className="mb-1 text-[0.72rem] font-medium text-ink-low">
                                    Gender <span className="text-[var(--error)]">*</span>
                                </div>
                            </div>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className={`w-auto min-w-[120px] cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-[0.85rem] outline-none transition-colors focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)] ${
                                    gender ? 'text-ink-hi' : 'text-ink-low'
                                }`}
                            >
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </section>

                    {/* Privacy Settings */}
                    <section className="glass-card mb-6 px-5 py-4">
                        <h2 className="eyebrow mb-4">
                            Privacy
                        </h2>
                        <div className="mb-5">
                            <label className="mb-1 block text-[0.85rem] font-medium text-ink-hi">
                                Workout Privacy
                            </label>
                            <p className="mb-2 text-[0.78rem] text-ink-low">
                                Who can see your workout logs on the activity feed
                            </p>
                            <select
                                value={workoutPrivacy}
                                onChange={(e) => setWorkoutPrivacy(e.target.value as 'public' | 'followers' | 'private')}
                                className="w-full cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-[0.9rem] text-ink-hi outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                            >
                                <option value="public">Public - Everyone can see</option>
                                <option value="followers">Followers Only</option>
                                <option value="private">Private - Only me</option>
                            </select>
                        </div>
                        <div className="mb-5">
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={autoPostWorkouts}
                                    onChange={(e) => setAutoPostWorkouts(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <span className="relative h-6 w-11 shrink-0 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:border-brand peer-checked:bg-brand peer-checked:after:translate-x-[20px] peer-focus-visible:shadow-[0_0_0_3px_var(--brand-glow-soft)]" />
                                <div>
                                    <div className="text-[0.85rem] font-medium text-ink-hi">Auto-post Workouts</div>
                                    <div className="text-[0.78rem] text-ink-low">
                                        Automatically share completed workouts to activity feed
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div>
                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={allowUnsolicitedMessages}
                                    onChange={(e) => setAllowUnsolicitedMessages(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <span className="relative h-6 w-11 shrink-0 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:border-brand peer-checked:bg-brand peer-checked:after:translate-x-[20px] peer-focus-visible:shadow-[0_0_0_3px_var(--brand-glow-soft)]" />
                                <div>
                                    <div className="text-[0.85rem] font-medium text-ink-hi">Allow Direct Messages</div>
                                    <div className="text-[0.78rem] text-ink-low">
                                        Let anyone send you direct messages
                                    </div>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section className="glass-card mb-6 px-5 py-4">
                        <h2 className="eyebrow mb-4">
                            Preferences
                        </h2>
                        <div>
                            <label className="mb-1 block text-[0.85rem] font-medium text-ink-hi">
                                Preferred Weight Unit
                            </label>
                            <p className="mb-2 text-[0.78rem] text-ink-low">
                                Default unit for logging weights
                            </p>
                            <select
                                value={preferredWeightUnit}
                                onChange={(e) => setPreferredWeightUnit(e.target.value as 'lbs' | 'kg')}
                                className="w-full cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-[0.9rem] text-ink-hi outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
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
                <section className="glass-card mb-6 px-5 py-4">
                    <h2 className="eyebrow mb-3">
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
                <section className="glass-card mb-6 px-5 py-4">
                    <h2 className="eyebrow mb-3">
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
                <section className="glass-card mb-6 px-5 py-4">
                    <h2 className="eyebrow mb-3">
                        Physique Photos
                    </h2>
                    {profilePhotos.length > 0 ? (
                        <div className="mb-4 grid grid-cols-3 gap-2">
                            {profilePhotos.map((path, i) => (
                                <div
                                    key={i}
                                    className="aspect-square overflow-hidden rounded-lg bg-[var(--surface-2)]"
                                >
                                    <img
                                        src={path}
                                        alt={`Physique photo ${i + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mb-4 text-[0.85rem] text-ink-mid">
                            No physique photos uploaded yet. Upload them during a coach interview or use the button below.
                        </p>
                    )}
                    <button
                        onClick={() => router.push('/coach')}
                        className="btn-soft !px-5 !py-2.5 !text-[0.85rem]"
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
                className="btn-brand w-full"
            >
                {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed bottom-8 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--success)] px-6 py-3 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                    <Check size={18} />
                    <span className="font-medium">Settings saved successfully!</span>
                </div>
            )}
        </div>
    );
}
