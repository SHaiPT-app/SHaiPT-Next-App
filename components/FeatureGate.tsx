'use client';

import { ReactNode } from 'react';
import { User, AIFeatures } from '@/lib/types';

interface FeatureGateProps {
    user: User;
    feature: keyof AIFeatures;
    children: ReactNode;
}

export default function FeatureGate({ user, feature, children }: FeatureGateProps) {
    const hasAccess = user.ai_features?.[feature] === true;

    if (hasAccess) {
        return <>{children}</>;
    }

    return (
        <div style={{ position: 'relative', minHeight: '400px', overflow: 'hidden' }}>
            {/* Blurred Content Background */}
            <div style={{ filter: 'blur(8px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
                {children}
            </div>

            {/* Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.6)',
                zIndex: 10,
                padding: '2rem',
                textAlign: 'center'
            }}>
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', border: '1px solid var(--accent)' }}>
                    <h2 style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '1.8rem' }}>Upgrade to Bro Version</h2>
                    <p style={{ marginBottom: '1.5rem', color: '#ccc' }}>
                        Unlock the full power of AI coaching with the Bro Version. Ask your trainer to enable this feature for you.
                    </p>
                    <div style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-orbitron)', color: 'var(--neon-orange)' }}>SHaiPT PRO</div>
                    <button
                        disabled
                        className="btn-primary"
                        style={{
                            background: 'var(--accent)',
                            color: 'black',
                            cursor: 'not-allowed',
                            opacity: 0.8
                        }}
                    >
                        Contact Trainer to Unlock
                    </button>
                </div>
            </div>
        </div>
    );
}
