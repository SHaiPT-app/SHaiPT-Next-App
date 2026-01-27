'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import TextType from '@/components/TextType';
import { fadeInUp, fadeInDown, staggerContainer, scaleIn } from '@/lib/animations';

export default function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '10%',
          width: '50vw',
          height: '50vw',
          background:
            'radial-gradient(circle, rgba(0, 212, 255, 0.08), transparent 70%)',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '40vw',
          height: '40vw',
          background:
            'radial-gradient(circle, rgba(255, 0, 127, 0.06), transparent 70%)',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 2rem',
          maxWidth: '1200px',
          width: '100%',
          margin: '1rem auto 0',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(21, 21, 31, 0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Image
            src="/logo_transparent.png"
            alt="SHaiPT"
            width={40}
            height={40}
          />
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#fff',
              fontFamily: 'var(--font-orbitron)',
            }}
          >
            SHaiPT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href="#features"
            style={{
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
          >
            Features
          </Link>
          <Link
            href="#pricing"
            style={{
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
          >
            Pricing
          </Link>
          <Link
            href="/login"
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              color: '#fff',
              background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
          >
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '5rem 1rem 0',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Badge */}
        <motion.div
          variants={fadeInDown}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.25)',
            borderRadius: '50px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#00d4ff',
            fontWeight: '600',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#39ff14',
              boxShadow: '0 0 8px #39ff14',
            }}
          />
          AI-Powered Personal Training
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: '900',
            color: '#fff',
            lineHeight: '1.1',
            marginBottom: '1.5rem',
            maxWidth: '900px',
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-orbitron)',
          }}
        >
          Let&apos;s{' '}
          <TextType
            text={['Get SHaiPT', 'Train Smart', 'Push Limits', 'Crush Goals']}
            as="span"
            typingSpeed={100}
            pauseDuration={5000}
            deletingSpeed={50}
            loop={true}
            textColors={['#00d4ff']}
            cursorCharacter="|"
            showCursor={true}
            cursorClassName=""
            style={{
              color: '#00d4ff',
              display: 'inline',
              textShadow: '0 0 30px rgba(0, 212, 255, 0.4)',
            }}
          />
        </motion.h1>

        <motion.div
          variants={fadeInUp}
          style={{
            background: 'rgba(21, 21, 31, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '2rem 2.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            marginBottom: '2.5rem',
            maxWidth: '700px',
          }}
        >
          <p
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: '1.7',
              margin: '0',
            }}
          >
            Real-time AI form analysis, periodized workout plans, and complete
            nutrition tracking — your personal trainer that never sleeps.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          variants={fadeInUp}
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '4rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/login"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
              color: 'white',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Start Free Trial
          </Link>
          <Link
            href="#features"
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.8)',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              fontSize: '1.1rem',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            See Features
          </Link>
        </motion.div>

        {/* Hero Composite Image */}
        <motion.div
          variants={scaleIn}
          style={{
            width: '100%',
            maxWidth: '1100px',
            position: 'relative',
            marginBottom: '-10%',
          }}
        >
          {/* Glow behind image */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '80%',
              background:
                'radial-gradient(ellipse, rgba(0, 212, 255, 0.1), transparent 70%)',
              filter: 'blur(60px)',
              zIndex: 0,
            }}
          />
          <Image
            src="/mockups/shaipt_app_showcase_v2.png"
            alt="SHaiPT App Showcase"
            width={1200}
            height={800}
            priority
            style={{
              width: '100%',
              height: 'auto',
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 -20px 60px rgba(0,0,0,0.5))',
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
