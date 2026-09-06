'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TitleSequence from '@/components/landing/TitleSequence';
import ScrollVideoSection from '@/components/landing/ScrollVideoSection';
import Chapters from '@/components/landing/Chapters';
import SpecSheet from '@/components/landing/SpecSheet';
import Statement from '@/components/landing/Statement';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';
import StaticBackground from '@/components/StaticBackground';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Defer session check so it never blocks initial paint.
    // Safari ITP may block cross-origin Supabase requests — fail silently.
    const timeout = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/home');
        }
      } catch {
        // Safari ITP or network failure — landing page works fine without auth.
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <StaticBackground>
      {/* A24 title sequence: black, type, a red rule, a ticking HUD. */}
      <TitleSequence />
      {/* Apple-style reveal: the storyboard pins on the left; the chapters scroll on the right. */}
      <ScrollVideoSection>
        <Chapters />
      </ScrollVideoSection>
      {/* Sci-fi spec sheet: what the camera measures, as an editorial table. */}
      <SpecSheet />
      {/* Fashion editorial statement over a monochrome still. */}
      <Statement />
      <Pricing />
      <Footer />
    </StaticBackground>
  );
}
