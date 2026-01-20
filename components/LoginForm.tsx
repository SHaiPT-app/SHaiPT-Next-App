'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';

export default function LoginForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState(''); // Can be email or username for login
    const [username, setUsername] = useState(''); // For signup only
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState<React.ReactNode>('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const passwordRules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        numberOrSpecial: /[0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    };

    const passwordStrength = (() => {
        let score = 0;
        if (password.length > 0) {
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;
        }
        return score;
    })();

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;

        // Ensure identifier is an email
        if (!identifier.includes('@')) {
            setError('Please enter your email address to resend confirmation.');
            return;
        }

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: identifier,
            });

            if (error) throw error;

            setResendCooldown(60);
            setError('Confirmation email resent! Please check your inbox.');
        } catch (err: any) {
            setError(err.message);
        }
    };

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
            if (event === 'SIGNED_IN' && session) {
                // Only handle initial session check or external provider sign-ins here
                // Manual sign-ins are handled in handleSubmit to avoid race conditions
                if (session.user.app_metadata.provider === 'google') {
                    // Google sign-in handling is done in callback page or here if needed
                    // For now, we let the callback page handle the redirection logic for OAuth
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGoogleAuth = async () => {
        try {
            setLoading(true);
            console.log('Starting Google OAuth...');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
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
                        full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User'
                    });

                    localStorage.setItem('user', JSON.stringify(newProfile));
                    router.push('/home');
                    return;
                }

                // Save complete user info and redirect
                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/home');
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

                if (password.length < 8) {
                    setError('Password must be at least 8 characters long.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.uppercase) {
                    setError('Password must contain at least one uppercase letter.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.numberOrSpecial) {
                    setError('Password must contain at least one number or special character.');
                    setLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setError('Passwords do not match.');
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
                            full_name: username
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
                    // Check if email confirmation is required and missing
                    // If session is null, it means confirmation is required (standard Supabase behavior)
                    // If session exists but email is not confirmed (Auto-sign-in enabled), we still want to enforce confirmation
                    // to avoid the "trap" where they can't log in again later.
                    if (!data.session || !data.user.email_confirmed_at) {
                        if (data.session) {
                            await supabase.auth.signOut();
                        }
                        setError('Account created! Please check your email to confirm your account.');
                        setLoading(false);
                        setIsLogin(true);
                        setResendCooldown(60);
                        return;
                    }

                    // Create profile in database
                    console.log('Creating user profile in database...');
                    console.log('Auth user ID:', data.user.id);

                    try {
                        const profile = await db.profiles.create({
                            id: data.user.id,
                            username: username,
                            email: email,
                            full_name: username
                        });

                        console.log('Profile created:', profile);

                        // Save user info and redirect
                        localStorage.setItem('user', JSON.stringify(profile));
                        router.push('/home');
                    } catch (profileError: any) {
                        console.error('Profile creation error:', profileError);
                        setError(`Profile creation failed: ${profileError.message}`);
                        setLoading(false);
                        return;
                    }
                } else {
                    setError('Please check your email to confirm your account.');
                    setLoading(false);
                    setResendCooldown(60);
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
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#888',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                    </button>
                </div>

                {!isLogin && (
                    <>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                className="input-field"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#888',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', height: '4px' }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        background: i <= passwordStrength ?
                                            (passwordStrength < 3 ? 'var(--error)' : passwordStrength < 5 ? 'var(--warning)' : 'var(--success)')
                                            : 'rgba(255,255,255,0.1)',
                                        borderRadius: '2px',
                                        transition: 'all 0.3s'
                                    }} />
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div style={{ color: passwordRules.length ? 'var(--success)' : '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{passwordRules.length ? '✓' : '○'}</span> 8+ characters
                                </div>
                                <div style={{ color: passwordRules.uppercase ? 'var(--success)' : '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{passwordRules.uppercase ? '✓' : '○'}</span> Uppercase
                                </div>
                                <div style={{ color: passwordRules.numberOrSpecial ? 'var(--success)' : '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{passwordRules.numberOrSpecial ? '✓' : '○'}</span> Number/Special
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {error && (() => {
                    const errorMsg = typeof error === 'string' ? error : '';
                    const isSuccessMessage = errorMsg.includes('check your email') || errorMsg.includes('check your inbox');

                    return (
                        <div style={{
                            color: isSuccessMessage ? 'var(--success)' : 'var(--error)',
                            marginBottom: '1rem',
                            fontSize: '0.875rem',
                            background: isSuccessMessage ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: `1px solid ${isSuccessMessage ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'}`,
                            textAlign: 'center'
                        }}>
                            {isSuccessMessage ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <span style={{ fontWeight: 'bold' }}>{errorMsg.includes('resent') ? 'Email Resent!' : 'Account Created!'}</span>
                                    <span>{errorMsg}</span>
                                </div>
                            ) : (
                                error
                            )}

                            {isSuccessMessage && (
                                <button
                                    type="button"
                                    onClick={handleResendEmail}
                                    disabled={resendCooldown > 0}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: '1rem',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                        opacity: resendCooldown > 0 ? 0.7 : 1,
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        width: '100%'
                                    }}
                                >
                                    {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Confirmation Email'}
                                </button>
                            )}
                        </div>
                    );
                })()}

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