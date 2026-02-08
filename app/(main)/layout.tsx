'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';
import PillNav from '@/components/PillNav';
import NotificationBell from '@/components/NotificationBell';
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

            // Get user profile from localStorage, then refresh from DB
            const storedUser = localStorage.getItem('user');
            let profile: Profile | null = null;

            if (storedUser) {
                profile = JSON.parse(storedUser);
                setUser(profile);
            }

            // Always fetch fresh profile from DB to get latest role/fields
            try {
                const freshProfile = await db.profiles.getById(session.user.id);
                if (freshProfile) {
                    profile = freshProfile;
                    setUser(freshProfile);
                    localStorage.setItem('user', JSON.stringify(freshProfile));
                }
            } catch {
                // Fall back to localStorage version
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
                background: 'rgba(21, 21, 31, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '1.5rem 1rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '80px',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
            }}>
                {/* PillNav centered */}
                <PillNav
                    logo="/circular_logo.png"
                    logoAlt="SHaiPT Logo"
                    items={[
                        { label: 'Activity', href: '/activity' },
                        { label: 'Home', href: '/home' },
                        { label: 'Coach List', href: '/coach' },
                        ...(user?.role === 'trainer' ? [{ label: 'Trainer', href: '/trainer' }] : []),
                    ]}
                    activeHref={pathname}
                    baseColor="rgba(255, 255, 255, 0.06)"
                    pillColor="transparent"
                    hoveredPillTextColor="#fff"
                    pillTextColor="rgba(255, 255, 255, 0.7)"
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
                    {/* Notification Bell */}
                    {user?.id && <NotificationBell userId={user.id} />}

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
                            // Clear local storage first to prevent stale user data
                            localStorage.removeItem('user');
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
