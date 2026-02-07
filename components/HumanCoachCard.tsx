'use client';

import { Star } from 'lucide-react';
import type { Profile } from '@/lib/types';

interface HumanCoachCardProps {
    trainer: Profile & { relationship_status?: string | null };
    onClick: () => void;
}

export default function HumanCoachCard({ trainer, onClick }: HumanCoachCardProps) {
    const isComingSoon = !trainer.is_accepting_clients;
    const status = trainer.relationship_status;

    const statusLabel = status === 'pending' ? 'Request Pending'
        : status === 'active' ? 'Active Coach'
        : status === 'waitlisted' ? 'Waitlisted'
        : status === 'declined' ? 'Declined'
        : null;

    const statusColor = status === 'active' ? '#4ade80'
        : status === 'pending' ? '#facc15'
        : status === 'waitlisted' ? '#60a5fa'
        : status === 'declined' ? '#f87171'
        : '#888';

    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1.5rem',
                background: isComingSoon
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: status === 'active'
                    ? '1px solid rgba(74, 222, 128, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                width: '100%',
                position: 'relative',
                opacity: isComingSoon ? 0.6 : 1,
            }}
        >
            {/* Coming Soon Overlay */}
            {isComingSoon && (
                <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#aaa',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Coming Soon
                </div>
            )}

            {/* Status Badge */}
            {statusLabel && (
                <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    background: `${statusColor}20`,
                    color: statusColor,
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    border: `1px solid ${statusColor}40`,
                }}>
                    {statusLabel}
                </div>
            )}

            {/* Avatar */}
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2A2A35, #3A3A45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                overflow: 'hidden',
                border: status === 'active'
                    ? '2px solid rgba(74, 222, 128, 0.5)'
                    : '2px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
            }}>
                {trainer.avatar_url ? (
                    <img
                        src={trainer.avatar_url}
                        alt={trainer.full_name || 'Trainer'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                ) : (
                    <span style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        color: '#888',
                        fontFamily: 'var(--font-orbitron)',
                    }}>
                        {(trainer.full_name || 'T').charAt(0)}
                    </span>
                )}
            </div>

            {/* Name */}
            <h3 style={{
                fontFamily: 'var(--font-orbitron)',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: 'var(--foreground)',
                marginBottom: '0.5rem',
                lineHeight: 1.3,
            }}>
                {trainer.full_name || 'Trainer'}
            </h3>

            {/* Rating */}
            {trainer.rating && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginBottom: '0.5rem',
                }}>
                    <Star size={14} color="#facc15" fill="#facc15" />
                    <span style={{ fontSize: '0.85rem', color: '#facc15', fontWeight: '600' }}>
                        {trainer.rating.toFixed(1)}
                    </span>
                </div>
            )}

            {/* Bio */}
            {trainer.trainer_bio && (
                <p style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    flexGrow: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {trainer.trainer_bio}
                </p>
            )}

            {/* Specialty Tags */}
            {trainer.specialties && trainer.specialties.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    justifyContent: 'center',
                }}>
                    {trainer.specialties.map((tag) => (
                        <span
                            key={tag}
                            style={{
                                padding: '0.2rem 0.6rem',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#aaa',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                fontWeight: '500',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </button>
    );
}
