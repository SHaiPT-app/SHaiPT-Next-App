'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile, WorkoutLog } from '@/lib/types';
import { User, Dumbbell, Flame, Target, Award, Settings, MapPin, Calendar } from 'lucide-react';

export default function ProfilePage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
    const [activeCoaches, setActiveCoaches] = useState<Profile[]>([]);
    const [clientCount, setClientCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/');
                return;
            }

            const parsed = JSON.parse(storedUser);

            // Verify session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/');
                return;
            }

            // Fetch fresh profile
            try {
                const profile = await db.profiles.getById(parsed.id);
                if (profile) {
                    setUser(profile);
                    localStorage.setItem('user', JSON.stringify(profile));
                } else {
                    setUser(parsed);
                }
            } catch {
                setUser(parsed);
            }

            // Fetch recent workouts
            try {
                const logs = await db.workoutLogs.getByUser(parsed.id, 5);
                setRecentWorkouts(logs);
            } catch {
                // Silently fail
            }

            // Fetch coaching relationships
            try {
                if (parsed.role === 'trainee') {
                    const coachRels = await db.coachingRelationships.getAsAthlete(parsed.id);
                    const coaches = await Promise.all(
                        coachRels.map(r => db.profiles.getById(r.coach_id).catch(() => null))
                    );
                    setActiveCoaches(coaches.filter((c): c is Profile => c !== null));
                } else if (parsed.role === 'trainer') {
                    const clientRels = await db.coachingRelationships.getAsCoach(parsed.id);
                    setClientCount(clientRels.length);
                }
            } catch {
                // Silently fail
            }

            setLoading(false);
        };

        init();
    }, [router]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    const streakDays = recentWorkouts.length; // Simple approximation

    return (
        <div className="mx-auto max-w-[700px] p-6">
            {/* Profile Header */}
            <div className="mb-8 text-center">
                {/* Avatar */}
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[3px] border-brand/30 bg-brand shadow-[0_0_24px_var(--brand-glow-soft)]">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.full_name || 'Profile'}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User size={36} className="text-ink-hi" />
                    )}
                </div>

                <h1 className="display mb-1 text-2xl">
                    {user.full_name || user.username || 'Athlete'}
                </h1>

                {user.username && (
                    <p className="mb-2 text-sm text-ink-mid">
                        @{user.username}
                    </p>
                )}

                {/* Role Badge */}
                <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.5px] ${
                        user.role === 'trainer'
                            ? 'border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)]'
                            : 'border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                    }`}
                >
                    {user.role || 'Trainee'}
                </span>

                {user.bio && (
                    <p className="mt-3 text-sm leading-normal text-ink-mid">
                        {user.bio}
                    </p>
                )}
            </div>

            {/* Stats Row */}
            <div className="mb-8 grid grid-cols-3 gap-3">
                <div className="glass-card p-4 text-center">
                    <Dumbbell size={20} className="mb-1.5 text-brand" />
                    <div className="text-[1.3rem] font-bold text-ink-hi">
                        {recentWorkouts.length}
                    </div>
                    <div className="text-[0.7rem] uppercase text-ink-low">
                        Recent Workouts
                    </div>
                </div>
                <div className="glass-card p-4 text-center">
                    <Flame size={20} className="mb-1.5 text-[var(--warning)]" />
                    <div className="text-[1.3rem] font-bold text-ink-hi">
                        {streakDays}
                    </div>
                    <div className="text-[0.7rem] uppercase text-ink-low">
                        Streak Days
                    </div>
                </div>
                <div className="glass-card p-4 text-center">
                    <Target size={20} className="mb-1.5 text-[var(--success)]" />
                    <div className="text-[1.3rem] font-bold text-ink-hi">
                        {user.fitness_goals?.length || 0}
                    </div>
                    <div className="text-[0.7rem] uppercase text-ink-low">
                        Goals
                    </div>
                </div>
            </div>

            {/* Personal Info */}
            <div className="glass-card mb-4 p-5">
                <h3 className="eyebrow mb-4">
                    Personal Info
                </h3>
                <div className="grid gap-3">
                    {user.height_cm && (
                        <InfoRow label="Height" value={`${user.height_cm} cm`} />
                    )}
                    {user.weight_kg && (
                        <InfoRow label="Weight" value={`${user.weight_kg} kg`} />
                    )}
                    {user.date_of_birth && (
                        <InfoRow label="Date of Birth" value={user.date_of_birth} />
                    )}
                    <InfoRow label="Gender" value={user.gender || 'Not set'} />
                    {user.fitness_goals && user.fitness_goals.length > 0 && (
                        <div className="flex items-start justify-between">
                            <span className="text-sm text-ink-low">Goals</span>
                            <div className="flex max-w-[60%] flex-wrap justify-end gap-1.5">
                                {user.fitness_goals.map(goal => (
                                    <span
                                        key={goal}
                                        className="rounded bg-[var(--brand-glow-soft)] px-2 py-0.5 text-xs text-brand"
                                    >
                                        {goal}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Coaching Info */}
            {user.role === 'trainee' && activeCoaches.length > 0 && (
                <div className="glass-card mb-4 p-5">
                    <h3 className="eyebrow mb-3">
                        Active Coaches
                    </h3>
                    {activeCoaches.map(coach => (
                        <div key={coach.id} className="flex items-center gap-3 py-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--success)] text-[0.8rem] font-bold text-ink-hi">
                                {(coach.full_name || 'C')[0]}
                            </div>
                            <span className="text-sm text-ink-mid">
                                {coach.full_name || coach.username}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {user.role === 'trainer' && (
                <div className="glass-card mb-4 p-5">
                    <h3 className="eyebrow mb-2">
                        Trainer Info
                    </h3>
                    <InfoRow label="Active Clients" value={String(clientCount)} />
                    {user.specialties && user.specialties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {user.specialties.map(s => (
                                <span
                                    key={s}
                                    className="rounded bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-2 py-0.5 text-xs text-[var(--success)]"
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Activity */}
            {recentWorkouts.length > 0 && (
                <div className="glass-card mb-4 p-5">
                    <h3 className="eyebrow mb-3">
                        Recent Workouts
                    </h3>
                    <div className="flex flex-col gap-2">
                        {recentWorkouts.map(log => (
                            <div
                                key={log.id}
                                className="flex justify-between border-b border-line-soft py-2 text-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-ink-low" />
                                    <span className="text-ink-mid">
                                        {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                                {log.total_duration_seconds && (
                                    <span className="text-brand">
                                        {Math.floor(log.total_duration_seconds / 60)} min
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Profile Button */}
            <button
                onClick={() => router.push('/settings')}
                className="btn-outline w-full !py-3 !text-sm"
            >
                <Settings size={18} />
                Edit Profile
            </button>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-ink-low">{label}</span>
            <span className="text-sm font-medium text-ink-mid">{value}</span>
        </div>
    );
}
