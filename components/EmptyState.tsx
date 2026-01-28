'use client';

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div
            className="glass-panel"
            data-testid="empty-state"
            style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
            }}
        >
            <Icon
                size={48}
                style={{ color: 'rgba(255, 255, 255, 0.2)', marginBottom: '0.5rem' }}
            />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                {title}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.9rem', maxWidth: '320px', margin: 0 }}>
                {description}
            </p>
            {action && (
                <button
                    className="btn-primary"
                    onClick={action.onClick}
                    style={{ marginTop: '0.75rem', padding: '0.75rem 1.5rem' }}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
