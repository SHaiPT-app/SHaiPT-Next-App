'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<'trainer' | 'trainee'>('trainee');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role }),
            });

            if (res.ok) {
                const data = await res.json();
                // Store user info in localStorage for easy access in client components
                localStorage.setItem('user', JSON.stringify(data.user));
                router.push('/dashboard');
            } else {
                const data = await res.json();
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

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
                    type="text"
                    placeholder="Username"
                    className="input-field"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                    {isLogin ? 'Login' : 'Sign Up'}
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
        </div>
    );
}
