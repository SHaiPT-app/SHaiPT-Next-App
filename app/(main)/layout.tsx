'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import PillNav from '@/components/PillNav';
import { User, Mail, Settings } from 'lucide-react';

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
                    initialLoadAnimation={false}
                />

                {/* Left Group: Profile & DM */}
                <div style={{
                    position: 'absolute',
                    left: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    height: '100%'
                }}>
                    {/* Profile Button */}
                    <button
                        onClick={() => router.push('/profile')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <User size={20} />
                    </button>

                    {/* DM Button */}
                    <button
                        onClick={() => router.push('/dms')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <Mail size={20} />
                    </button>
                </div>

                {/* Right Group: Settings & Logout */}
                <div style={{
                    position: 'absolute',
                    right: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    height: '100%'
                }}>
                    {/* Settings Button (Icon Only) */}
                    <button
                        onClick={() => router.push('/settings')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        <Settings size={20} />
                    </button>

                    {/* Logout Button */}
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/');
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '0 1rem',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        Log Out
                    </button>
                </div>
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
