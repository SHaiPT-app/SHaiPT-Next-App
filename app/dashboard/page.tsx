'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
// We will implement these components next
import TrainerDashboard from '@/components/TrainerDashboard';
import TraineeDashboard from '@/components/TraineeDashboard';
import ProfileModal from '@/components/ProfileModal';
import AICoachChat from '@/components/ai-coach/AICoachChat';

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
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
        return <div className="flex min-h-screen items-center justify-center p-8 text-ink-mid">Loading...</div>;
    }

    return (
        <main className="mx-auto min-h-screen max-w-[1400px] p-6 md:p-8">
            <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <h1 className="display text-gradient-brand text-[2rem]">
                    Welcome, {user.username}
                </h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="btn-brand !px-4 !py-2 !text-sm"
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
                        className="btn-outline !px-4 !py-2 !text-sm"
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

            <AICoachChat
                user={user}
                isOpen={isChatOpen}
                onToggle={() => setIsChatOpen(!isChatOpen)}
            />
        </main>
    );
}
