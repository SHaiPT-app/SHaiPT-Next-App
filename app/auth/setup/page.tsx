'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';

function UsernameSetupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
    const [error, setError] = useState<React.ReactNode>('');
    const [loading, setLoading] = useState(false);
    
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!userId || !email) {
            router.push('/');
        }
    }, [userId, email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check if email already exists (edge case protection)
            const existingEmailProfile = await db.profiles.getByEmail(email!);
            if (existingEmailProfile) {
                setError(
                    <>
                        This email is already associated with another account. Please use a different email or{' '}
                        <span
                            onClick={() => router.push('/')}
                            style={{ 
                                color: 'var(--primary)', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontSize: 'inherit'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            log in
                        </span>
                        {' '}with your existing account.
                    </>
                );
                setLoading(false);
                return;
            }

            // Check if username is already taken
            const existingUser = await db.profiles.getByUsername(username);
            if (existingUser) {
                setError('Username already taken. Please choose another.');
                setLoading(false);
                return;
            }

            // Create profile
            const profile = await db.profiles.create({
                id: userId!,
                username: username,
                email: email!,
                role: role,
                display_name: username
            });

            // Save user info and redirect
            localStorage.setItem('user', JSON.stringify(profile));
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Profile creation error:', err);
            
            // Handle specific constraint violation
            if (err.message.includes('profiles_email_unique')) {
                setError(
                    <>
                        This email is already associated with another account. Please{' '}
                        <span
                            onClick={() => router.push('/')}
                            style={{ 
                                color: 'var(--primary)', 
                                textDecoration: 'underline', 
                                cursor: 'pointer',
                                fontSize: 'inherit'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            log in
                        </span>
                        {' '}with your existing account instead.
                    </>
                );
            } else {
                setError(err.message || 'Failed to create profile');
            }
            setLoading(false);
        }
    };

    if (!userId || !email) {
        return null;
    }

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    Complete Your Profile
                </h2>
                <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#888' }}>
                    Choose a username and your role to get started
                </p>

                <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'var(--secondary)', borderRadius: '8px', padding: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setRole('trainee')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            background: role === 'trainee' ? 'var(--primary)' : 'transparent',
                            color: role === 'trainee' ? 'white' : 'var(--foreground)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Trainee
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('trainer')}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            background: role === 'trainer' ? 'var(--primary)' : 'transparent',
                            color: role === 'trainer' ? 'white' : 'var(--foreground)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Trainer
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        disabled
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#888'
                        }}
                    />
                    
                    <input
                        type="text"
                        placeholder="Choose a username"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="^[a-zA-Z0-9_]+$"
                        title="Username can only contain letters, numbers, and underscores"
                    />

                    {error && (
                        <div style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ width: '100%' }}
                        disabled={loading || !username}
                    >
                        {loading ? 'Creating Profile...' : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function UsernameSetup() {
    return (
        <Suspense fallback={
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                color: '#888'
            }}>
                Loading...
            </div>
        }>
            <UsernameSetupForm />
        </Suspense>
    );
}