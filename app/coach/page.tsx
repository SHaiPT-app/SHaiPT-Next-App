'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Bot, Users } from 'lucide-react';
import { coaches } from '@/data/coaches';
import type { CoachPersona } from '@/data/coaches';
import type { Profile } from '@/lib/types';
import HumanCoachCard from '@/components/HumanCoachCard';
import CoachRequestModal from '@/components/CoachRequestModal';

function CoachCard({ coach, isSelected, onSelect }: {
    coach: CoachPersona;
    isSelected: boolean;
    onSelect: (coach: CoachPersona) => void;
}) {
    return (
        <button
            onClick={() => onSelect(coach)}
            data-testid={`coach-card-${coach.id}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1.5rem',
                background: isSelected
                    ? 'rgba(255, 102, 0, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: isSelected
                    ? '1px solid var(--neon-orange)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isSelected
                    ? '0 0 20px rgba(255, 102, 0, 0.2)'
                    : '0 4px 30px rgba(0, 0, 0, 0.1)',
                width: '100%',
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isSelected
                        ? 'linear-gradient(135deg, var(--neon-orange), var(--neon-pink))'
                        : 'linear-gradient(135deg, #2A2A35, #3A3A45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    overflow: 'hidden',
                    border: isSelected
                        ? '2px solid var(--neon-orange)'
                        : '2px solid rgba(255, 255, 255, 0.15)',
                    flexShrink: 0,
                }}
            >
                <img
                    src={coach.avatarUrl}
                    alt={coach.fullName}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                            target.parentElement.innerHTML = `<span style="font-size:1.8rem;font-weight:700;color:${isSelected ? '#fff' : '#888'};font-family:var(--font-orbitron)">${coach.fullName.charAt(0)}</span>`;
                        }
                    }}
                />
            </div>

            {/* Name */}
            <h3
                style={{
                    fontFamily: 'var(--font-orbitron)',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: isSelected ? 'var(--neon-orange)' : 'var(--foreground)',
                    marginBottom: '0.75rem',
                    lineHeight: 1.3,
                }}
            >
                {coach.displayName}
            </h3>

            {/* Coaching Style */}
            <p
                style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    flexGrow: 1,
                }}
            >
                {coach.coachingStyle}
            </p>

            {/* Specialty Tags */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    justifyContent: 'center',
                }}
            >
                {coach.specialtyTags.map((tag) => (
                    <span
                        key={tag}
                        style={{
                            padding: '0.2rem 0.6rem',
                            background: isSelected
                                ? 'rgba(255, 102, 0, 0.15)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? 'var(--neon-orange)' : '#aaa',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                            border: isSelected
                                ? '1px solid rgba(255, 102, 0, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </button>
    );
}

type TabType = 'ai' | 'human';

export default function CoachSelectionPage() {
    const [activeTab, setActiveTab] = useState<TabType>('ai');
    const [selectedCoach, setSelectedCoach] = useState<CoachPersona | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [trainers, setTrainers] = useState<(Profile & { relationship_status?: string | null })[]>([]);
    const [trainersLoading, setTrainersLoading] = useState(false);
    const [selectedTrainer, setSelectedTrainer] = useState<(Profile & { relationship_status?: string | null }) | null>(null);
    const router = useRouter();

    // Auth guard + get user ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            } else {
                setCurrentUserId(user.id);
            }
        });
    }, [router]);

    const fetchTrainers = useCallback(async () => {
        if (!currentUserId) return;
        setTrainersLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }
            const res = await fetch(`/api/coaching/trainers?userId=${currentUserId}`, { headers });
            if (res.ok) {
                const { trainers: data } = await res.json();
                setTrainers(data || []);
            }
        } catch {
            // Silently fail
        } finally {
            setTrainersLoading(false);
        }
    }, [currentUserId]);

    // Fetch trainers when switching to human tab
    useEffect(() => {
        if (activeTab === 'human' && currentUserId) {
            fetchTrainers();
        }
    }, [activeTab, currentUserId, fetchTrainers]);

    const handleSelect = (coach: CoachPersona) => {
        setSelectedCoach(coach);
    };

    const handleStartTraining = () => {
        if (selectedCoach) {
            router.push(`/coach/${selectedCoach.id}`);
        }
    };

    const handleTrainerClick = (trainer: Profile & { relationship_status?: string | null }) => {
        if (!trainer.is_accepting_clients) {
            // Show a simple alert for coming-soon trainers
            alert(`${trainer.full_name} is not yet accepting clients. Check back soon!`);
            return;
        }
        setSelectedTrainer(trainer);
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--background)',
                color: 'var(--foreground)',
                padding: '2rem 1.5rem',
            }}
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => router.push('/home')}
                            aria-label="Back to Home"
                            style={{
                                background: 'rgba(255, 102, 0, 0.15)',
                                border: '1px solid rgba(255, 102, 0, 0.3)',
                                borderRadius: '8px',
                                padding: '0.5rem 0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: '#FF6600',
                                cursor: 'pointer',
                                flexShrink: 0,
                                fontSize: '0.85rem',
                                fontWeight: '600',
                            }}
                        >
                            <ArrowLeft size={18} />
                            Home
                        </button>
                        <h1
                            style={{
                                fontFamily: 'var(--font-orbitron)',
                                fontSize: '2rem',
                                color: 'var(--neon-orange)',
                            }}
                        >
                            Coach List
                        </h1>
                    </div>
                    <p style={{ color: '#888', fontSize: '0.95rem' }}>
                        Browse AI and human coaches to match your training goals.
                    </p>
                </div>

                {/* Tab Toggle */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '2rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '0.25rem',
                    maxWidth: '400px',
                }}>
                    <button
                        onClick={() => setActiveTab('ai')}
                        style={{
                            flex: 1,
                            padding: '0.7rem',
                            background: activeTab === 'ai' ? 'var(--primary, #FF6600)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: activeTab === 'ai' ? 'white' : '#888',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'ai' ? '600' : '400',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        <Bot size={16} />
                        AI Coaches
                    </button>
                    <button
                        onClick={() => setActiveTab('human')}
                        style={{
                            flex: 1,
                            padding: '0.7rem',
                            background: activeTab === 'human' ? 'var(--primary, #FF6600)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: activeTab === 'human' ? 'white' : '#888',
                            cursor: 'pointer',
                            fontWeight: activeTab === 'human' ? '600' : '400',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                        }}
                    >
                        <Users size={16} />
                        Human Coaches
                    </button>
                </div>

                {/* AI Coaches Tab */}
                {activeTab === 'ai' && (
                    <>
                        <div
                            data-testid="coach-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '1.25rem',
                                marginBottom: '2rem',
                            }}
                        >
                            {coaches.map((coach) => (
                                <CoachCard
                                    key={coach.id}
                                    coach={coach}
                                    isSelected={selectedCoach?.id === coach.id}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>

                        {/* Selected Coach CTA */}
                        {selectedCoach && (
                            <div
                                data-testid="selected-coach-cta"
                                style={{
                                    position: 'fixed',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: '1.25rem 1.5rem',
                                    background: 'rgba(21, 21, 31, 0.95)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    borderTop: '1px solid rgba(255, 102, 0, 0.2)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    zIndex: 100,
                                }}
                            >
                                <span style={{ color: '#ccc', fontSize: '0.95rem' }}>
                                    Selected: <strong style={{ color: 'var(--neon-orange)' }}>{selectedCoach.displayName}</strong>
                                </span>
                                <button
                                    data-testid="start-training-btn"
                                    className="btn-primary"
                                    onClick={handleStartTraining}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        fontSize: '0.95rem',
                                        fontWeight: '600',
                                        borderRadius: '10px',
                                    }}
                                >
                                    Start Training
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Human Coaches Tab */}
                {activeTab === 'human' && (
                    <>
                        {trainersLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                                Loading trainers...
                            </div>
                        ) : trainers.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#888',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}>
                                <Users size={40} color="#555" style={{ marginBottom: '1rem' }} />
                                <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No human coaches available yet</p>
                                <p style={{ fontSize: '0.85rem' }}>Check back soon — trainers are being onboarded!</p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                    gap: '1.25rem',
                                    marginBottom: '2rem',
                                }}
                            >
                                {trainers.map((trainer) => (
                                    <HumanCoachCard
                                        key={trainer.id}
                                        trainer={trainer}
                                        onClick={() => handleTrainerClick(trainer)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Coach Request Modal */}
            {selectedTrainer && currentUserId && (
                <CoachRequestModal
                    trainer={selectedTrainer}
                    athleteId={currentUserId}
                    onClose={() => setSelectedTrainer(null)}
                    onSuccess={() => {
                        fetchTrainers();
                    }}
                />
            )}
        </div>
    );
}
