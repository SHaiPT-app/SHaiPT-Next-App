'use client';

import { useState } from 'react';
import { X, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface CoachRequestModalProps {
    trainer: Profile & { relationship_status?: string | null };
    athleteId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CoachRequestModal({ trainer, athleteId, onClose, onSuccess }: CoachRequestModalProps) {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const status = trainer.relationship_status;

    const handleSendRequest = async () => {
        setSending(true);
        setError(null);

        try {
            // Get auth session for the access token
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            // Fetch intake data from coach_interviews if available
            let intakeData = null;
            try {
                const { data: interview } = await supabase
                    .from('coach_interviews')
                    .select('intake_data')
                    .eq('user_id', athleteId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (interview?.intake_data) {
                    intakeData = interview.intake_data;
                }
            } catch {
                // No intake data — that's fine
            }

            const res = await fetch('/api/coaching/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    athleteId,
                    coachId: trainer.id,
                    intakeData,
                    accessToken,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send request');
            }

            setSent(true);
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1001,
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(30, 30, 45, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '420px',
                    width: '100%',
                    position: 'relative',
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                    }}
                >
                    <X size={20} />
                </button>

                {/* Trainer Info */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2A2A35, #3A3A45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                        overflow: 'hidden',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                    }}>
                        {trainer.avatar_url ? (
                            <img
                                src={trainer.avatar_url}
                                alt={trainer.full_name || 'Trainer'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#888' }}>
                                {(trainer.full_name || 'T').charAt(0)}
                            </span>
                        )}
                    </div>
                    <h2 style={{
                        fontFamily: 'var(--font-orbitron)',
                        fontSize: '1.1rem',
                        color: 'white',
                        marginBottom: '0.25rem',
                    }}>
                        {trainer.full_name}
                    </h2>
                </div>

                {/* Status-specific content */}
                {status === 'pending' ? (
                    <div style={{ textAlign: 'center' }}>
                        <Clock size={36} color="#facc15" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ color: '#facc15', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Request Pending
                        </p>
                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                            Your coaching request has been sent. You&apos;ll be notified when {trainer.full_name} responds.
                        </p>
                    </div>
                ) : status === 'active' ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={36} color="#4ade80" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Active Coaching Relationship
                        </p>
                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                            {trainer.full_name} is your active coach. Check your messages or trainer dashboard.
                        </p>
                    </div>
                ) : status === 'declined' ? (
                    <div style={{ textAlign: 'center' }}>
                        <XCircle size={36} color="#f87171" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ color: '#f87171', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Request Declined
                        </p>
                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                            Unfortunately, this coach declined your request. You may try again later.
                        </p>
                    </div>
                ) : status === 'waitlisted' ? (
                    <div style={{ textAlign: 'center' }}>
                        <Clock size={36} color="#60a5fa" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ color: '#60a5fa', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Waitlisted
                        </p>
                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                            You&apos;re on the waitlist. You&apos;ll be notified when a spot opens up.
                        </p>
                    </div>
                ) : sent ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={36} color="#4ade80" style={{ marginBottom: '0.75rem' }} />
                        <p style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Request Sent!
                        </p>
                        <p style={{ color: '#999', fontSize: '0.85rem' }}>
                            You&apos;ll be notified when {trainer.full_name} responds.
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{
                            color: '#ccc',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                        }}>
                            Send a coaching request to <strong>{trainer.full_name}</strong>. Your intake data (if available) will be shared so they can review your fitness profile.
                        </p>

                        {error && (
                            <div style={{
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                marginBottom: '1rem',
                                color: '#f87171',
                                fontSize: '0.85rem',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSendRequest}
                            disabled={sending}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: sending ? 'rgba(255, 102, 0, 0.5)' : 'var(--neon-orange, #FF6600)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Send size={18} />
                            {sending ? 'Sending...' : 'Send Request'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
