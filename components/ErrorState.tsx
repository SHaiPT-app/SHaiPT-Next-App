'use client';

import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export default function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
    return (
        <div
            data-testid="error-state"
            style={{
                padding: '1.25rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
            }}
        >
            <AlertTriangle
                size={20}
                style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }}
            />
            <div style={{ flex: 1 }}>
                <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#ef4444',
                    margin: '0 0 0.25rem 0',
                }}>
                    {title}
                </h4>
                <p style={{
                    fontSize: '0.85rem',
                    color: 'rgba(239, 68, 68, 0.8)',
                    margin: 0,
                    lineHeight: 1.5,
                }}>
                    {message}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        style={{
                            marginTop: '0.75rem',
                            padding: '0.4rem 1rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
}
