import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';
import StaticBackground from '@/components/StaticBackground';

export default function Home() {
  return (
    <StaticBackground>
      <Hero />
      <Features />
      <Footer />
    </StaticBackground>
  );
}
