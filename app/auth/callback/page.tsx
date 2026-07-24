'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';

export default function AuthCallback() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    setError(`Authentication failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                const { session } = data;
                if (!session) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const errorDescription = hashParams.get('error_description');

                    if (errorDescription) {
                        setError(`OAuth Error: ${errorDescription}`);
                        setLoading(false);
                        return;
                    }

                    if (accessToken) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: sessionData } = await supabase.auth.getSession();

                        if (sessionData.session) {
                            await handleUserSession(sessionData.session);
                            return;
                        }
                    }

                    router.push('/login');
                    return;
                }

                await handleUserSession(session);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(`Something went wrong: ${message}`);
                setLoading(false);
            }
        };

        const handleUserSession = async (session: { user: { id: string; email?: string; user_metadata?: Record<string, string> } }) => {
            const profile = await db.profiles.getById(session.user.id);

            if (profile) {
                // Returning user → dashboard
                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/home');
            } else {
                // New user → check for metadata from email signup
                const { username } = session.user.user_metadata || {};

                if (username) {
                    try {
                        const newProfile = await db.profiles.create({
                            id: session.user.id,
                            username,
                            email: session.user.email || '',
                            full_name: username
                        });
                        localStorage.setItem('user', JSON.stringify(newProfile));
                        router.push('/home');
                        return;
                    } catch {
                        // Fall through to onboarding setup
                    }
                }

                // New OAuth user → onboarding
                router.push(`/auth/setup?userId=${session.user.id}&email=${encodeURIComponent(session.user.email || '')}`);
            }
        };

        handleAuthCallback();
    }, [router]);

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--background)]">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '200px', height: '200px' }}
                >
                    <source src="/loader.webm" type="video/webm" />
                </video>
                <p className="text-[1.2rem] text-ink-hi">
                    Setting up your account...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--background)] p-4">
                <div className="glass-card flex w-full max-w-[420px] flex-col items-center gap-4 p-6 text-center md:p-8">
                    <p className="text-[1.2rem] text-red-400">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="btn-brand"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
