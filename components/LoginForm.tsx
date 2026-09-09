'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import { motion } from 'framer-motion';
import { fadeInUp, tapScale } from '@/lib/animations';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react';

/**
 * Google and Apple sign-in are only offered when the Supabase project actually has those
 * providers configured; without that the buttons bounce off Supabase with a provider error.
 * Set NEXT_PUBLIC_ENABLE_OAUTH=1 once they are set up.
 */
function oauthAvailable(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_OAUTH === '1';
}

export default function LoginForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const passwordRules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        numberOrSpecial: /[0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)
    };

    const passwordStrength = (() => {
        let score = 0;
        if (password.length > 0) {
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score++;
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

    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const profile = await db.profiles.getById(session.user.id);
                if (profile) {
                    router.push('/home');
                }
            }
        };
        checkExistingSession();
    }, [router]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                if (session.user.app_metadata.provider === 'google' || session.user.app_metadata.provider === 'apple') {
                    // OAuth sign-in handling is done in callback page
                }
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;
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
            setSuccessMessage('Confirmation email resent! Please check your inbox.');
            setError('');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend email';
            setError(message);
        }
    };

    const handleOAuth = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    ...(provider === 'google' && {
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                    }),
                }
            });
            if (error) {
                setError(error.message);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `${provider} auth failed`;
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (isLogin) {
                const isEmail = identifier.includes('@');
                let email = identifier;

                if (!isEmail) {
                    const profile = await db.profiles.getByUsername(identifier);
                    if (!profile) {
                        setError('Username not found');
                        setLoading(false);
                        return;
                    }
                    email = profile.email;
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    setError(`Login failed: ${error.message}`);
                    setLoading(false);
                    return;
                }

                const profile = await db.profiles.getById(data.user.id);

                if (!profile) {
                    const newProfile = await db.profiles.create({
                        id: data.user.id,
                        username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'user',
                        email: data.user.email || '',
                        full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User'
                    });
                    localStorage.setItem('user', JSON.stringify(newProfile));
                    router.push('/auth/setup?userId=' + data.user.id + '&email=' + encodeURIComponent(data.user.email || ''));
                    return;
                }

                localStorage.setItem('user', JSON.stringify(profile));
                router.push('/home');
            } else {
                const email = identifier;

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    setError('Please enter a valid email address.');
                    setLoading(false);
                    return;
                }

                if (!passwordRules.length) {
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

                // invite-only while SHaiPT is in its test phase
                try {
                    const inviteRes = await fetch('/api/invites/check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });
                    const invite = await inviteRes.json();
                    if (!invite.allowed) {
                        setError('SHaiPT is invite-only for now. Ask Ali for an invite for this email address.');
                        setLoading(false);
                        return;
                    }
                } catch {
                    setError('Could not check your invite. Please try again.');
                    setLoading(false);
                    return;
                }

                try {
                    const { data: existingEmailProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (existingEmailProfile) {
                        setError('Account already exists. Please log in instead.');
                        setLoading(false);
                        return;
                    }
                } catch {
                    // No existing account found - continue
                }

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
                } catch {
                    // No existing username found - continue
                }

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
                    setError(error.message);
                    setLoading(false);
                    return;
                }

                if (data.user) {
                    if (!data.session || !data.user.email_confirmed_at) {
                        if (data.session) {
                            await supabase.auth.signOut();
                        }
                        setSuccessMessage('Account created! Please check your email to confirm your account.');
                        setError('');
                        setLoading(false);
                        setIsLogin(true);
                        setResendCooldown(60);
                        return;
                    }

                    try {
                        const profile = await db.profiles.create({
                            id: data.user.id,
                            username: username,
                            email: email,
                            full_name: username
                        });
                        localStorage.setItem('user', JSON.stringify(profile));
                        router.push('/home');
                    } catch (profileError: unknown) {
                        const message = profileError instanceof Error ? profileError.message : 'Profile creation failed';
                        setError(message);
                        setLoading(false);
                        return;
                    }
                } else {
                    setSuccessMessage('Please check your email to confirm your account.');
                    setError('');
                    setLoading(false);
                    setResendCooldown(60);
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    const strengthColor = passwordStrength < 3 ? 'var(--error)' : passwordStrength < 5 ? 'var(--warning)' : 'var(--brand)';

    return (
        <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="glass-card w-full max-w-[420px] p-6 md:p-8"
        >
            <h2 className="font-display mb-6 text-center text-2xl font-bold tracking-tight text-ink-hi">
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3">
                    {/* Email / Username input */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-low">
                            <Mail size={18} />
                        </span>
                        <input
                            type={isLogin ? "text" : "email"}
                            placeholder={isLogin ? "Email or Username" : "Email"}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                            className="h-12 w-full rounded-lg border border-line-soft bg-[var(--surface-1)] pl-10 pr-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand"
                        />
                    </div>

                    {/* Username input (signup only) */}
                    {!isLogin && (
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-low">
                                <User size={18} />
                            </span>
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="h-12 w-full rounded-lg border border-line-soft bg-[var(--surface-1)] pl-10 pr-3 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    )}

                    {/* Password input */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-low">
                            <Lock size={18} />
                        </span>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-12 w-full rounded-lg border border-line-soft bg-[var(--surface-1)] pl-10 pr-11 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand"
                        />
                        <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 z-[1] flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-ink-low transition-colors hover:text-ink-mid"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Confirm password + strength (signup only) */}
                    {!isLogin && (
                        <>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-low">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="h-12 w-full rounded-lg border border-line-soft bg-[var(--surface-1)] pl-10 pr-11 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand focus:ring-1 focus:ring-brand"
                                />
                            </div>

                            {/* Password strength indicator */}
                            <div>
                                <div className="mb-2 flex h-1 gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="h-1 flex-1 rounded-[2px] transition-all duration-300"
                                            style={{ background: i <= passwordStrength ? strengthColor : 'var(--line-soft)' }}
                                        />
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-1 text-xs">
                                    <span className={`min-w-[45%] ${passwordRules.length ? 'text-brand' : 'text-ink-low'}`}>
                                        {passwordRules.length ? '✓' : '○'} 8+ characters
                                    </span>
                                    <span className={`min-w-[45%] ${passwordRules.uppercase ? 'text-brand' : 'text-ink-low'}`}>
                                        {passwordRules.uppercase ? '✓' : '○'} Uppercase
                                    </span>
                                    <span className={`min-w-[45%] ${passwordRules.numberOrSpecial ? 'text-brand' : 'text-ink-low'}`}>
                                        {passwordRules.numberOrSpecial ? '✓' : '○'} Number/Special
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Success message */}
                    {successMessage && (
                        <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <CheckCircle size={24} color="var(--success)" />
                                <p className="text-sm font-bold text-brand">
                                    {successMessage.includes('resent') ? 'Email Resent!' : 'Account Created!'}
                                </p>
                                <p className="text-sm text-brand">{successMessage}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={resendCooldown > 0}
                                className="btn-brand mt-4 h-10 w-full !text-sm"
                            >
                                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Confirmation Email'}
                            </button>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-center">
                            <p className="text-sm text-red-400">{error}</p>
                            {error.includes('already exists') && (
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(true)}
                                    className="mt-1 cursor-pointer border-none bg-transparent p-0 text-sm text-brand underline"
                                >
                                    Log in
                                </button>
                            )}
                        </div>
                    )}

                    {/* Submit button */}
                    <motion.button
                        type="submit"
                        {...tapScale}
                        disabled={loading}
                        className="btn-brand h-12 w-full"
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                    </motion.button>

                    {/* Divider */}
                    {oauthAvailable() && (
                    <div className="my-1 flex items-center gap-3">
                        <div className="h-px flex-1 bg-line-soft" />
                        <span className="text-sm text-ink-mid">or</span>
                        <div className="h-px flex-1 bg-line-soft" />
                    </div>
                    )}

                    {/* OAuth buttons */}
                    {oauthAvailable() && (
                    <div className="flex flex-col gap-2">
                        <motion.button
                            type="button"
                            onClick={() => handleOAuth('google')}
                            disabled={loading}
                            {...tapScale}
                            className="btn-outline h-12 w-full disabled:opacity-60"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18">
                                <path fill="currentColor" d="M16.51,8H8.98v3h4.3c-0.18,0.95-0.75,1.77-1.58,2.26v1.69h2.55C15.47,13.78,16.51,11.17,16.51,8z" />
                                <path fill="currentColor" d="M8.98,17c2.16,0,3.97-0.72,5.3-1.94l-2.55-1.69c-0.75,0.5-1.71,0.8-2.75,0.8c-2.11,0-3.9-1.43-4.54-3.35H1.83v1.71C3.15,15.04,5.83,17,8.98,17z" />
                                <path fill="currentColor" d="M4.43,10.77c-0.16-0.5-0.26-1.04-0.26-1.58s0.09-1.08,0.26-1.58V5.9H1.83C1.29,7.01,1,8.25,1,9.6s0.29,2.59,0.83,3.69L4.43,10.77z" />
                                <path fill="currentColor" d="M8.98,3.58c1.19,0,2.26,0.41,3.1,1.22l2.3-2.3C13.94,1.19,11.7,0,8.98,0C5.83,0,3.15,1.96,1.83,4.47l2.6,2.02C5.08,5.01,6.87,3.58,8.98,3.58z" />
                            </svg>
                            <span>Continue with Google</span>
                        </motion.button>

                        <motion.button
                            type="button"
                            onClick={() => handleOAuth('apple')}
                            disabled={loading}
                            {...tapScale}
                            className="btn-outline h-12 w-full disabled:opacity-60"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                <path d="M13.71 9.04c-.02-1.86 1.52-2.76 1.59-2.8-.87-1.27-2.22-1.44-2.7-1.46-1.14-.12-2.24.68-2.82.68-.58 0-1.48-.66-2.43-.65-1.25.02-2.41.73-3.05 1.86-1.3 2.26-.33 5.61.94 7.44.62.9 1.36 1.91 2.33 1.87.94-.04 1.29-.6 2.42-.6s1.45.6 2.44.58c1.01-.02 1.64-.91 2.25-1.82.71-1.04 1-2.04 1.02-2.1-.02-.01-1.95-.75-1.99-2.98v-.02zM11.85 3.5c.52-.63.86-1.5.77-2.37-.74.03-1.64.5-2.17 1.12-.48.55-.9 1.43-.78 2.28.82.06 1.66-.42 2.18-1.03z" />
                            </svg>
                            <span>Continue with Apple</span>
                        </motion.button>
                    </div>
                    )}

                    {/* Toggle login/signup */}
                    <p className="text-center text-sm text-ink-mid">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="cursor-pointer border-none bg-transparent p-0 text-sm text-brand underline transition-colors hover:text-brand-hot"
                        >
                            {isLogin ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </div>
            </form>
        </motion.div>
    );
}
