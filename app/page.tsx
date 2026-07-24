'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Hero, { HeroCopy } from '@/components/landing/Hero';
import ScrollVideoSection from '@/components/landing/ScrollVideoSection';
import AppShowcase from '@/components/landing/AppShowcase';
import Features from '@/components/landing/Features';
import Comparison from '@/components/landing/Comparison';
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
      <Hero />
      {/* Video pins in the left column; this content scrolls down the right. */}
      <ScrollVideoSection>
        <HeroCopy />
        <AppShowcase />
        <Features />
      </ScrollVideoSection>
      <Comparison />
      <Pricing />
      <Footer />
    </StaticBackground>
  );
}
