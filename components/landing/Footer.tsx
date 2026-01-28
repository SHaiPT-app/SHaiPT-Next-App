'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal } from '@/components/ScrollReveal';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Comparison', href: '#comparison' },
    { label: 'Changelog', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* CTA Banner */}
      <ScrollReveal>
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto 4rem',
            padding: '0 1rem',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.1), rgba(255, 102, 0, 0.05))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 102, 0, 0.15)',
              padding: '4rem 2rem',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-50%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '100%',
                background: 'radial-gradient(ellipse, rgba(255, 102, 0, 0.1), transparent 70%)',
                filter: 'blur(60px)',
                zIndex: 0,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2
                style={{
                  fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                  fontWeight: '800',
                  color: '#fff',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-orbitron)',
                }}
              >
                Ready to Transform Your Training?
              </h2>
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: '2rem',
                  maxWidth: '500px',
                  margin: '0 auto 2rem',
                }}
              >
                Join thousands of athletes training smarter with AI.
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #FF6600, #CC5200)',
                  color: '#fff',
                  padding: '1rem 3rem',
                  borderRadius: '50px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 0 30px rgba(255, 102, 0, 0.3)',
                  transition: 'transform 0.2s',
                }}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Footer Links */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '3rem 2rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Image
                src="/logo_transparent.png"
                alt="SHaiPT"
                width={32}
                height={32}
              />
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  fontFamily: 'var(--font-orbitron)',
                  background: 'linear-gradient(135deg, #FF6600, #FF8533)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SHaiPT
              </span>
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: '1.6',
                maxWidth: '220px',
              }}
            >
              AI-powered personal training — form analysis, smart programming,
              and nutrition coaching.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '1rem',
                }}
              >
                {category}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: '1100px',
            margin: '3rem auto 0',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.8rem',
            }}
          >
            &copy; {new Date().getFullYear()} SHaiPT. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link
              href="/login"
              style={{
                color: 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/login"
              style={{
                color: 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
