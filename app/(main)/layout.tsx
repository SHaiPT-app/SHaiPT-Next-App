'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseDb';
import type { Profile } from '@/lib/types';
import PillNav from '@/components/PillNav';
import NotificationBell from '@/components/NotificationBell';
import { User, Mail, Settings, LogOut } from 'lucide-react';
import { fourDcoachUrl, FOURD_COACH_DEFAULT } from '@/lib/fourDcoach';

/** Circular icon action button used in the app header. */
function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="icon-btn">
      {children}
    </button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // resolved on the client: on a LAN dev server it points at the Vite dev server of the same host
  const [fourD, setFourD] = useState(FOURD_COACH_DEFAULT);
  useEffect(() => setFourD(fourDcoachUrl()), []);

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

  const handleLogout = async () => {
    // Clear local storage first to prevent stale user data
    localStorage.removeItem('user');
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top header: PillNav centered, actions on both sides */}
      <header className="sticky top-0 z-[999] flex min-h-[80px] items-center justify-center border-b border-line-soft bg-[rgba(21,21,31,0.6)] px-4 py-6 shadow-[0_4px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
        <PillNav
          logo="/circular_logo.png"
          logoAlt="SHaiPT Logo"
          items={[
            { label: 'Activity', href: '/activity' },
            { label: 'Home', href: '/home' },
            { label: 'Coach List', href: '/coach' },
            { label: '4Dcoach', href: fourD },
            ...(user?.role === 'trainer' ? [{ label: 'Trainer', href: '/trainer' }] : []),
          ]}
          activeHref={pathname}
          baseColor="rgba(255, 255, 255, 0.06)"
          pillColor="transparent"
          hoveredPillTextColor="#fff"
          pillTextColor="rgba(255, 255, 255, 0.7)"
          initialLoadAnimation={false}
        />

        {/* Left group: profile & DMs */}
        <div className="absolute left-4 flex h-full items-center gap-3">
          <HeaderIconButton label="Profile" onClick={() => router.push('/profile')}>
            <User size={20} />
          </HeaderIconButton>
          <HeaderIconButton label="Messages" onClick={() => router.push('/dms')}>
            <Mail size={20} />
          </HeaderIconButton>
        </div>

        {/* Right group: notifications, settings, logout */}
        <div className="absolute right-4 flex h-full items-center gap-3">
          {user?.id && <NotificationBell userId={user.id} />}
          <HeaderIconButton label="Settings" onClick={() => router.push('/settings')}>
            <Settings size={20} />
          </HeaderIconButton>
          <button
            onClick={handleLogout}
            className="icon-btn !w-auto gap-2 rounded-full px-4 text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hide-mobile">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
