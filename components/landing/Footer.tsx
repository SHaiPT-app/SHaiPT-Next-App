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
    <footer className="relative overflow-hidden">
      {/* CTA banner */}
      <ScrollReveal>
        <div className="mx-auto mb-16 max-w-5xl px-4">
          <div className="glass-card relative overflow-hidden border-brand/20 bg-[linear-gradient(135deg,rgba(218,0,35,0.1),rgba(218,0,35,0.04))] px-8 py-16 text-center">
            <div className="absolute -top-1/2 left-1/2 h-full w-3/5 -translate-x-1/2 bg-[radial-gradient(ellipse,var(--brand-glow-soft),transparent_70%)] blur-[60px]" />
            <div className="relative z-[1] flex flex-col items-center">
              <div className="brand-bars mb-6">
                <span /><span /><span />
              </div>
              <h2 className="display mb-4 text-[clamp(1.8rem,4vw,3rem)]">
                Ready to Get <span className="text-gradient-brand">SHaiPT</span>?
              </h2>
              <p className="mx-auto mb-8 max-w-lg text-lg text-ink-mid">
                Join thousands of athletes training smarter with AI.
              </p>
              <Link href="/login" className="btn-brand !px-12 !text-lg">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Footer links */}
      <div className="border-t border-line-soft px-8 pb-8 pt-12">
        <div className="mx-auto grid max-w-5xl grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Image src="/logo_transparent.png" alt="SHaiPT" width={32} height={32} />
              <span className="font-display text-gradient-brand text-xl font-extrabold">
                SHaiPT
              </span>
            </div>
            <p className="max-w-[220px] text-sm leading-relaxed text-ink-low">
              AI-powered personal training. Form analysis, smart programming,
              and nutrition coaching.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ink-low">
                {category}
              </h4>
              <div className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-ink-low transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6">
          <span className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} SHaiPT. All rights reserved.
          </span>
          <div className="flex gap-6">
            <Link href="/login" className="text-sm text-ink-low transition-colors hover:text-brand">
              Sign In
            </Link>
            <Link href="/login" className="text-sm text-ink-low transition-colors hover:text-brand">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
