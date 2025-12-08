'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import PillNav from '@/components/PillNav';

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
            {/* Top Header with PillNav and Settings */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 999,
                background: 'rgba(21, 21, 31, 0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.5rem 1rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80px'
            }}>
                {/* PillNav centered */}
                <PillNav
                    logo="/circular_logo.png"
                    logoAlt="SHaiPT Logo"
                    items={[
                        { label: 'Activity', href: '/activity' },
                        { label: 'Home', href: '/home' },
                        { label: 'AI Coach', href: '/ai' }
                    ]}
                    activeHref={pathname}
                    baseColor="#F25F29"
                    pillColor="rgba(255, 255, 255, 0.9)"
                    hoveredPillTextColor="#fff"
                    pillTextColor="#000"
                />

                {/* Settings button positioned absolutely to the right */}
                <button
                    onClick={() => router.push('/settings')}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        height: '42px'
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
                overflowY: 'auto'
            }}>
                {children}
            </main>
        </div>
    );
}
