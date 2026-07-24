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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    const streakDays = recentWorkouts.length; // Simple approximation

    return (
        <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
            {/* Profile Header */}
            <div style={{
                textAlign: 'center',
                marginBottom: '2rem',
            }}>
                {/* Avatar */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    overflow: 'hidden',
                    border: '3px solid rgba(255, 102, 0, 0.3)',
                }}>
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.full_name || 'Profile'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <User size={36} color="white" />
                    )}
                </div>

                <h1 style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '1.5rem',
                    color: 'white',
                    marginBottom: '0.25rem',
                }}>
                    {user.full_name || user.username || 'Athlete'}
                </h1>

                {user.username && (
                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        @{user.username}
                    </p>
                )}

                {/* Role Badge */}
                <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: user.role === 'trainer'
                        ? 'rgba(74, 222, 128, 0.15)'
                        : 'rgba(255, 102, 0, 0.15)',
                    color: user.role === 'trainer' ? '#4ade80' : 'var(--primary)',
                    border: `1px solid ${user.role === 'trainer' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 102, 0, 0.3)'}`,
                }}>
                    {user.role || 'Trainee'}
                </span>

                {user.bio && (
                    <p style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
                        {user.bio}
                    </p>
                )}
            </div>

            {/* Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '2rem',
            }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <Dumbbell size={20} color="var(--primary)" style={{ marginBottom: '0.4rem' }} />
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'white' }}>
                        {recentWorkouts.length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                        Recent Workouts
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <Flame size={20} color="#f59e0b" style={{ marginBottom: '0.4rem' }} />
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'white' }}>
                        {streakDays}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                        Streak Days
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <Target size={20} color="#4ade80" style={{ marginBottom: '0.4rem' }} />
                    <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'white' }}>
                        {user.fitness_goals?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                        Goals
                    </div>
                </div>
            </div>

            {/* Personal Info */}
            <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'white', marginBottom: '1rem' }}>
                    Personal Info
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Goals</span>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                                {user.fitness_goals.map(goal => (
                                    <span key={goal} style={{
                                        fontSize: '0.75rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 102, 0, 0.1)',
                                        color: 'var(--primary)',
                                    }}>
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
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'white', marginBottom: '0.75rem' }}>
                        Active Coaches
                    </h3>
                    {activeCoaches.map(coach => (
                        <div key={coach.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem 0',
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#4ade80',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                color: 'white',
                            }}>
                                {(coach.full_name || 'C')[0]}
                            </div>
                            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                                {coach.full_name || coach.username}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {user.role === 'trainer' && (
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                        Trainer Info
                    </h3>
                    <InfoRow label="Active Clients" value={String(clientCount)} />
                    {user.specialties && user.specialties.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {user.specialties.map(s => (
                                <span key={s} style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    background: 'rgba(74, 222, 128, 0.1)',
                                    color: '#4ade80',
                                }}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Activity */}
            {recentWorkouts.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'white', marginBottom: '0.75rem' }}>
                        Recent Workouts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recentWorkouts.map(log => (
                            <div key={log.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                fontSize: '0.85rem',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={14} color="#888" />
                                    <span style={{ color: '#ccc' }}>
                                        {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                                {log.total_duration_seconds && (
                                    <span style={{ color: 'var(--primary)' }}>
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
                style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#ccc',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                }}
            >
                <Settings size={18} />
                Edit Profile
            </button>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{label}</span>
            <span style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: '500' }}>{value}</span>
        </div>
    );
}
