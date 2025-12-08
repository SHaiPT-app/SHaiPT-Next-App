'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import StaticBackground from '@/components/StaticBackground';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/home');
      }
    };
    checkSession();
  }, [router]);

  return (
    <StaticBackground>
      <Hero />
      <Features />
      <Footer />
    </StaticBackground>
  );
}
