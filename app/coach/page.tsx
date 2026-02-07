'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { coaches } from '@/data/coaches';
import type { CoachPersona } from '@/data/coaches';

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

export default function CoachSelectionPage() {
    const [selectedCoach, setSelectedCoach] = useState<CoachPersona | null>(null);
    const router = useRouter();

    const handleSelect = (coach: CoachPersona) => {
        setSelectedCoach(coach);
    };

    const handleStartTraining = () => {
        if (selectedCoach) {
            router.push(`/coach/${selectedCoach.id}`);
        }
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
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            <Home size={20} />
                        </button>
                        <h1
                            style={{
                                fontFamily: 'var(--font-orbitron)',
                                fontSize: '2rem',
                                color: 'var(--neon-orange)',
                            }}
                        >
                            Choose Your AI Coach
                        </h1>
                    </div>
                    <p style={{ color: '#888', fontSize: '0.95rem' }}>
                        Select a coaching persona that matches your training goals and style.
                    </p>
                </div>

                {/* Coach Grid */}
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
            </div>
        </div>
    );
}
