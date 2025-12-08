'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check authentication
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/');
                return;
            }

            // Get user profile from localStorage or fetch
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }

            setLoading(false);
        };

        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'var(--background)'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const isActive = (path: string) => pathname === path;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--foreground)'
        }}>
            {/* Top Header with Settings */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 999,
                background: 'rgba(21, 21, 31, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'flex-end'
            }}>
                <button
                    onClick={() => router.push('/settings')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6m5.66-13L14 9m-4 6-3.66 3.66M23 12h-6m-6 0H1m16.66 5.66L14 15m-4-6L6.34 5.66"></path>
                    </svg>
                    Settings
                </button>
            </header>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                paddingBottom: '80px', // Space for bottom nav
                overflowY: 'auto'
            }}>
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70px',
                background: 'rgba(21, 21, 31, 0.95)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 1rem',
                zIndex: 1000
            }}>
                {/* Activity */}
                <button
                    onClick={() => router.push('/activity')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: isActive('/activity') ? 'var(--primary)' : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: '0.5rem 1rem'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: isActive('/activity') ? '600' : '400' }}>
                        Activity
                    </span>
                </button>

                {/* Home */}
                <button
                    onClick={() => router.push('/home')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: isActive('/home') ? 'var(--primary)' : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: '0.5rem 1rem'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: isActive('/home') ? '600' : '400' }}>
                        Home
                    </span>
                </button>

                {/* AI */}
                <button
                    onClick={() => router.push('/ai')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: isActive('/ai') ? 'var(--primary)' : '#888',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        padding: '0.5rem 1rem'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <circle cx="9" cy="10" r="1"></circle>
                        <circle cx="15" cy="10" r="1"></circle>
                        <path d="M9 14c.5.5 1.5 1 3 1s2.5-.5 3-1"></path>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: isActive('/ai') ? '600' : '400' }}>
                        AI Coach
                    </span>
                </button>
            </nav>
        </div>
    );
}
