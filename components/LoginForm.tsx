'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';

export default function LoginForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
    const [identifier, setIdentifier] = useState(''); // Can be email or username
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<React.ReactNode>('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Check for existing session on component mount
    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('Found existing session on mount:', session.user.email);
            } else {
                console.log('No existing session found');
            }
        };
        checkExistingSession();
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email || 'No session');

            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in via:', session.user.app_metadata.provider || 'unknown', 'Email:', session.user.email);

                try {
                    console.log('Checking if user profile exists for:', session.user.id);

                    // Use the authenticated session to check profile
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    console.log('Profile lookup result:', { profile: !!profile, error: profileError });

                    if (profile) {
                        // User exists, redirect to dashboard
                        console.log('Found existing profile, redirecting to dashboard');
                        localStorage.setItem('user', JSON.stringify(profile));
                        router.push('/dashboard');
                        return;
                    } else if (profileError && profileError.code !== 'PGRST116') {
                        // PGRST116 means "no rows found", anything else is a real error
                        console.error('Profile lookup failed with error:', profileError);
                        throw profileError;
                    } else {
                        console.log('No profile found for user, treating as new user');
                    }

                    // Check if email already exists (different auth user) using authenticated session
                    const { data: existingEmailProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', session.user.email || '')
                        .neq('id', session.user.id)
                        .single();

                    if (existingEmailProfile) {
                        // Email exists with different auth method
                        console.log('Email already exists with different auth method');
                        await supabase.auth.signOut();
                        setError(
                            <>
                                Account with this email already exists. Please{' '}
                                <span
                                    onClick={() => setIsLogin(true)}
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
                                {' '}with your email and password instead.
                            </>
                        );
                        return;
                    }

                    // New Google user, redirect to username setup
                    router.push(`/auth/setup?userId=${session.user.id}&email=${session.user.email}`);
                } catch (error: any) {
                    console.error('Profile check error:', error);
                    await supabase.auth.signOut();
                    setError('Authentication error. Please try again.');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleGoogleAuth = async () => {
        try {
            setLoading(true);
            console.log('Starting Google OAuth...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });
            console.log('OAuth response:', { data, error });
            if (error) {
                console.error('OAuth error:', error);
                setError(error.message);
            }
        } catch (err: any) {
            console.error('OAuth catch error:', err);
            setError(err.message || 'Google auth failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                console.log('Starting login process with identifier:', identifier);

                // Check if identifier is email or username
                const isEmail = identifier.includes('@');
                let email = identifier;

                if (!isEmail) {
                    console.log('Identifier is username, looking up email...');
                    // It's a username, find the email
                    const profile = await db.profiles.getByUsername(identifier);
                    if (!profile) {
                        console.log('Username not found in profiles');
                        setError('Username not found');
                        setLoading(false);
                        return;
                    }
                    email = profile.email;
                    console.log('Found email for username:', email);
                } else {
                    console.log('Identifier is email:', email);
                }

                // Supabase Login with email
                console.log('Attempting Supabase auth with email:', email);
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                console.log('Supabase auth response:', { data: !!data.user, error });

                if (error) {
                    console.error('Supabase auth error:', error);
                    setError(`Login failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                // Get user profile from database
                const profile = await db.profiles.getById(data.user.id);

                if (!profile) {
                    // Profile doesn't exist, create it from auth user metadata
                    console.log('Profile not found, creating from auth user...');
                    const newProfile = await db.profiles.create({
                        id: data.user.id,
                        username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user',
                        email: data.user.email || '',
                        role: data.user.user_metadata?.role || 'trainee',
                        display_name: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user'
                    });

                    localStorage.setItem('user', JSON.stringify(newProfile));
                    router.push('/dashboard');
                    return;
                }

                // Save complete user info and redirect
                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/dashboard');
            } else {
                // Signup flow
                const email = identifier; // For signup, identifier is always email

                // Basic validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Please enter a valid email address.');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    setError('Password must be at least 6 characters long.');
                    setLoading(false);
                    return;
                }

                if (username.length < 3) {
                    setError('Username must be at least 3 characters long.');
                    setLoading(false);
                    return;
                }

                // Check if email already exists using authenticated client
                try {
                    const { data: existingEmailProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (existingEmailProfile) {
                        setError(
                            <>
                                Account already exists.{' '}
                                <span
                                    onClick={() => setIsLogin(true)}
                                    style={{
                                        color: 'var(--primary)',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: 'inherit'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    Log in
                                </span>
                            </>
                        );
                        setLoading(false);
                        return;
                    }
                } catch (emailCheckError) {
                    // If error is not "no rows found", it's a real error
                    console.log('Email check result: no existing account found (or unable to check)');
                }

                // Check if username is already taken
                try {
                    const { data: existingUsername } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('username', username)
                        .single();

                    if (existingUsername) {
                        setError('Username already taken. Please choose another.');
                        setLoading(false);
                        return;
                    }
                } catch (usernameCheckError) {
                    // If error is not "no rows found", it's a real error
                    console.log('Username check result: no existing username found (or unable to check)');
                }

                // Wait a moment for auth user to be fully created
                console.log('Waiting for auth user to be fully created...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Supabase Signup
                console.log('Creating Supabase auth user...');
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username,
                            role: role
                        }
                    }
                });

                if (error) {
                    console.error('Supabase auth error:', error);
                    setError(error.message);
                    setLoading(false);
                    return;
                }

                if (data.user) {
                    // Create profile in database
                    console.log('Creating user profile in database...');
                    console.log('Auth user ID:', data.user.id);

                    try {
                        const profile = await db.profiles.create({
                            id: data.user.id,
                            username: username,
                            email: email,
                            role: role,
                            display_name: username
                        });

                        console.log('Profile created:', profile);

                        // Save user info and redirect
                        localStorage.setItem('user', JSON.stringify(profile));
                        router.push('/dashboard');
                    } catch (profileError: any) {
                        console.error('Profile creation error:', profileError);
                        setError(`Profile creation failed: ${profileError.message}`);
                        setLoading(false);
                        return;
                    }
                } else {
                    setError('Please check your email to confirm your account.');
                    setLoading(false);
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            console.error('Error details:', JSON.stringify(err));

            if (err?.code) {
                setError(`Error: ${err.message || err.code}`);
            } else if (err?.message) {
                setError(err.message);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError('An unexpected error occurred. Please check the console for details.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            {!isLogin && (
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
            )}

            <form onSubmit={handleSubmit}>
                <input
                    type={isLogin ? "text" : "email"}
                    placeholder={isLogin ? "Email or Username" : "Email"}
                    className="input-field"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                />
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Username"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                )}
                <input
                    type="password"
                    placeholder="Password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && (
                    <div style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn-primary"
                    style={{ width: '100%', marginBottom: '1rem' }}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>

                <div style={{ textAlign: 'center', margin: '1rem 0', color: '#888' }}>
                    or
                </div>

                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#4285F4',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M16.51,8H8.98v3h4.3c-0.18,0.95-0.75,1.77-1.58,2.26v1.69h2.55C15.47,13.78,16.51,11.17,16.51,8z" />
                        <path fill="#34A853" d="M8.98,17c2.16,0,3.97-0.72,5.3-1.94l-2.55-1.69c-0.75,0.5-1.71,0.8-2.75,0.8c-2.11,0-3.9-1.43-4.54-3.35H1.83v1.71C3.15,15.04,5.83,17,8.98,17z" />
                        <path fill="#FBBC05" d="M4.43,10.77c-0.16-0.5-0.26-1.04-0.26-1.58s0.09-1.08,0.26-1.58V5.9H1.83C1.29,7.01,1,8.25,1,9.6s0.29,2.59,0.83,3.69L4.43,10.77z" />
                        <path fill="#EA4335" d="M8.98,3.58c1.19,0,2.26,0.41,3.1,1.22l2.3-2.3C13.94,1.19,11.7,0,8.98,0C5.83,0,3.15,1.96,1.83,4.47l2.6,2.02C5.08,5.01,6.87,3.58,8.98,3.58z" />
                    </svg>
                    Continue with Google
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </form>

        </div >
    );
}