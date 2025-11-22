'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
// We will implement these components next
import TrainerDashboard from '@/components/TrainerDashboard';
import TraineeDashboard from '@/components/TraineeDashboard';

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [router]);

    if (!user) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <main style={{ minHeight: '100vh', padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    Welcome, {user.username}
                </h1>
                <button
                    onClick={() => {
                        localStorage.removeItem('user');
                        // In a real app, call logout API to clear cookie
                        router.push('/');
                    }}
                    style={{ background: 'var(--secondary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                    Logout
                </button>
            </header>

            {user.role === 'trainer' ? (
                <TrainerDashboard user={user} />
            ) : (
                <TraineeDashboard user={user} />
            )}
        </main>
    );
}
