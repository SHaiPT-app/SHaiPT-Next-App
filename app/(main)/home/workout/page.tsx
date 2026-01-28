'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import WorkoutLogger from '@/components/WorkoutLogger';
import type { Profile } from '@/lib/types';

export default function WorkoutPage() {
    const router = useRouter();

    const user = useMemo<Profile | null>(() => {
        if (typeof window === 'undefined') return null;
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    }, []);

    return (
        <div style={{ padding: '1.5rem', paddingBottom: '2rem' }}>
            {/* Back button */}
            <button
                onClick={() => router.push('/home')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    padding: '0.25rem 0',
                    fontSize: '0.9rem'
                }}
            >
                <ArrowLeft size={18} />
                Back to Dashboard
            </button>

            <WorkoutLogger userId={user?.id || ''} />
        </div>
    );
}
