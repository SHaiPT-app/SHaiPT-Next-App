'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/supabaseDb';
import { motion } from 'framer-motion';
import { fadeInUp, tapScale } from '@/lib/animations';
import { User } from 'lucide-react';

function UsernameSetupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!userId || !email) {
            router.push('/login');
        }
    }, [userId, email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const existingEmailProfile = await db.profiles.getByEmail(email!);
            if (existingEmailProfile) {
                setError('This email is already associated with another account. Please log in instead.');
                setLoading(false);
                return;
            }

            const existingUser = await db.profiles.getByUsername(username);
            if (existingUser) {
                setError('Username already taken. Please choose another.');
                setLoading(false);
                return;
            }

            const profile = await db.profiles.create({
                id: userId!,
                username: username,
                email: email!,
                role: role,
                full_name: username
            });

            localStorage.setItem('user', JSON.stringify(profile));
            router.push('/home');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create profile';
            if (message.includes('profiles_email_unique')) {
                setError('This email is already associated with another account. Please log in instead.');
            } else {
                setError(message);
            }
            setLoading(false);
        }
    };

    if (!userId || !email) {
        return null;
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080C] p-4">
            {/* Ambient brand glow */}
            <div className="glow-orb -top-[15%] left-[15%] h-[45vw] w-[45vw]" />
            <div className="glow-orb glow-orb--pink -bottom-[15%] right-[10%] h-[35vw] w-[35vw]" />

            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="glass-card relative z-[1] w-full max-w-[420px] p-6 md:p-8"
            >
                <div className="flex flex-col gap-4">
                    <h2 className="font-display text-center text-2xl font-bold tracking-tight text-ink-hi">
                        Complete Your Profile
                    </h2>
                    <p className="text-center text-sm text-ink-mid">
                        Choose a username and your role to get started
                    </p>

                    {/* Role toggle */}
                    <div className="flex rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] p-1">
                        <button
                            type="button"
                            onClick={() => setRole('trainee')}
                            className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                role === 'trainee'
                                    ? 'bg-[image:var(--brand-gradient)] text-white shadow-[0_0_16px_var(--brand-glow-soft)]'
                                    : 'bg-transparent text-ink-mid hover:text-ink-hi'
                            }`}
                        >
                            Trainee
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('trainer')}
                            className={`h-10 flex-1 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                role === 'trainer'
                                    ? 'bg-[image:var(--brand-gradient)] text-white shadow-[0_0_16px_var(--brand-glow-soft)]'
                                    : 'bg-transparent text-ink-mid hover:text-ink-hi'
                            }`}
                        >
                            Trainer
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-3">
                            {/* Email (disabled) */}
                            <input
                                type="email"
                                value={email || ''}
                                disabled
                                className="h-12 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 text-ink-low outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {/* Username */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-low">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    maxLength={20}
                                    pattern="^[a-zA-Z0-9_]+$"
                                    title="Username can only contain letters, numbers, and underscores"
                                    className="h-12 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] pl-10 pr-4 text-ink-hi outline-none transition-colors placeholder:text-ink-low focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-center">
                                    <p className="text-sm text-red-400">{error}</p>
                                    {error.includes('log in') && (
                                        <button
                                            type="button"
                                            onClick={() => router.push('/login')}
                                            className="mt-1 cursor-pointer border-none bg-transparent p-0 text-sm text-brand underline"
                                        >
                                            Go to Login
                                        </button>
                                    )}
                                </div>
                            )}

                            <motion.button
                                type="submit"
                                {...tapScale}
                                disabled={loading || !username}
                                className="btn-brand h-12 w-full"
                            >
                                {loading ? 'Creating Profile...' : 'Complete Setup'}
                            </motion.button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default function UsernameSetup() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#08080C]">
                <p className="text-ink-low">Loading...</p>
            </div>
        }>
            <UsernameSetupForm />
        </Suspense>
    );
}
