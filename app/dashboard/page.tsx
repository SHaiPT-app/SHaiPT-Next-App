'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
// We will implement these components next
import TrainerDashboard from '@/components/TrainerDashboard';
import TraineeDashboard from '@/components/TraineeDashboard';
import ProfileModal from '@/components/ProfileModal';

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const initializeAuth = async () => {
            // First check localStorage for user data
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/');
                return;
            }

            const parsedUser = JSON.parse(storedUser);

            // DEV BYPASS
            if (parsedUser.id === 'dev-user-id') {
                console.log('Dev user detected, skipping Supabase session check');
                setUser(parsedUser);
                setAuthReady(true);
                return;
            }

            // Then verify Supabase session is available
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('No valid Supabase session found');
                localStorage.removeItem('user');
                router.push('/');
                return;
            }

            // Both localStorage user and Supabase session are valid
            setUser(parsedUser);
            setAuthReady(true);
        };

        initializeAuth();

        // Also listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('user');
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    if (!user || !authReady) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <main style={{ minHeight: '100vh', padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    Welcome, {user.username}
                </h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        style={{
                            background: 'var(--primary)',
                            border: 'none',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Profile
                    </button>
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
                </div>
            </header>

            {user.role === 'trainer' ? (
                <TrainerDashboard user={user} />
            ) : (
                <TraineeDashboard user={user} />
            )}

            <ProfileModal
                user={user}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }}
            />
        </main>
    );
}
