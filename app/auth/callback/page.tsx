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
                console.log('Processing auth callback...');
                // Handle the OAuth callback
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    setError(`Authentication failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                const { session } = data;
                if (!session) {
                    console.log('No session found immediately, checking URL hash...');
                    // Try to get session from URL hash (OAuth flow)
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const accessToken = hashParams.get('access_token');
                    const errorDescription = hashParams.get('error_description');

                    if (errorDescription) {
                        console.error('OAuth error from URL:', errorDescription);
                        setError(`OAuth Error: ${errorDescription}`);
                        setLoading(false);
                        return;
                    }

                    if (accessToken) {
                        console.log('Found access token in URL, waiting for session...');
                        // Wait a bit for the session to be established
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: sessionData } = await supabase.auth.getSession();

                        if (sessionData.session) {
                            console.log('Session established after wait');
                            await handleUserSession(sessionData.session);
                            return;
                        }
                    }

                    console.log('No session or access token found, redirecting to login');
                    router.push('/');
                    return;
                }

                console.log('Session found immediately:', session.user.email);
                await handleUserSession(session);
            } catch (err: any) {
                console.error('Callback handling error:', err);
                setError(`Something went wrong: ${err.message || 'Unknown error'}`);
                setLoading(false);
            }
        };

        const handleUserSession = async (session: any) => {
            // Check if user profile exists
            const profile = await db.profiles.getById(session.user.id);

            if (profile) {
                // User exists, redirect to dashboard
                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/dashboard');
            } else {
                // New Google user, redirect to username setup
                router.push(`/auth/setup?userId=${session.user.id}&email=${session.user.email}`);
            }
        };

        handleAuthCallback();
    }, [router]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '1.2rem' }}>Setting up your account...</div>
                <div style={{
                    border: '3px solid var(--secondary)',
                    borderTop: '3px solid var(--primary)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ color: 'var(--error)', fontSize: '1.2rem' }}>{error}</div>
                <button
                    onClick={() => router.push('/')}
                    className="btn-primary"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return null;
}