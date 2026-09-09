'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TitleSequence from './TitleSequence';
import PhoneReveal from './PhoneReveal';
import Faq from './Faq';
import ClosingBeat from './ClosingBeat';
import SpecSheet from './SpecSheet';
import Statement from './Statement';
import Pricing from './Pricing';
import Footer from './Footer';
import StaticBackground from '@/components/StaticBackground';

export default function LandingPage() {
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
      {/* The layered reveal: the A24 title sequence is the hero state; the phone rises out of it and
          pins while its screen cycles through the five 4Dcoach views, one chapter of type at a time. */}
      <PhoneReveal hero={<TitleSequence />} />
      {/* Sci-fi spec sheet: what the camera measures, as an editorial table. */}
      <SpecSheet />
      {/* Fashion editorial statement over a monochrome still. */}
      <Statement />
      <Pricing />
      {/* Editorial FAQ: mono questions, thin rules, no cards. */}
      <Faq />
      {/* Closing beat: the opening scene again, the phone, one last pair of links. */}
      <ClosingBeat />
      <Footer />
    </StaticBackground>
  );
}
