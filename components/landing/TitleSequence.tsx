'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useFourDcoachUrl } from '@/lib/fourDcoach';

const LINES = ['Real-time', 'smart 4D', 'form check.'];

/**
 * Title sequence: a black screen, three lines of editorial type revealed one
 * after another, one red rule, and a HUD that keeps time. Nothing floats,
 * nothing glows for its own sake. The nav is the only chrome.
 */
export default function TitleSequence() {
    const fourD = useFourDcoachUrl();
    const clockRef = useRef<HTMLSpanElement>(null);
    const lockRef = useRef<HTMLSpanElement>(null);

    // The timecode runs from the moment the page opens; pose lock drifts like a real readout.
    useEffect(() => {
        const t0 = performance.now();
        let raf = 0;
        const tick = () => {
            const t = (performance.now() - t0) / 1000;
            const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 30);
            if (clockRef.current) clockRef.current.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
            if (lockRef.current && f % 6 === 0) lockRef.current.textContent = `${(98.4 + Math.sin(t * 0.7) * 1.1).toFixed(1)}%`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <section className="ts" aria-label="SHaiPT">
            {/* A bench press, filmed on a phone, plays quietly behind the titles: the product is the footage. */}
            <video className="ts-film" src="/hero/bench.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden />
            <div className="ts-veil" aria-hidden />
            <div className="ts-grain" aria-hidden />

            <nav className="ts-nav">
                <Link href="/" className="ts-brand" aria-label="SHaiPT home">
                    <Image src="/logo_transparent.png" alt="" width={28} height={28} priority />
                    <span>
                        SH<em>ai</em>PT
                    </span>
                </Link>
                <div className="ts-nav-links">
                    <a href="#chapters">Reel</a>
                    <a href="#spec">Spec</a>
                    <a href="#pricing">Pricing</a>
                    <Link href="/login">Sign in</Link>
                    <Link href="/login" className="ts-cta">
                        Get started
                    </Link>
                </div>
            </nav>

            <div className="ts-corners" aria-hidden>
                <i /><i /><i /><i />
            </div>

            <div className="ts-meta ts-meta--tl">SHaiPT — 4D coaching system</div>
            <div className="ts-meta ts-meta--tr">Vol. 01 — 2026</div>

            <div className="ts-title">
                {LINES.map((line, i) => (
                    <h1 key={line} className={`ts-line${i === 1 ? ' ts-line--em' : ''}`} style={{ animationDelay: `${0.5 + i * 0.85}s` }}>
                        {line}
                    </h1>
                ))}
                <div className="ts-rule" />
                <p className="ts-sub">All you want from a personal trainer. At home or in the gym, form is king: one phone, no wearable, every rep measured, replayed in 3D, scored.</p>
                <div className="ts-actions">
                    <Link href="/login" className="ts-btn">
                        Get started
                    </Link>
                    <a href={fourD} className="ts-link">
                        Try the 4D replay <span aria-hidden>→</span>
                    </a>
                </div>
            </div>

            <div className="ts-hud" aria-hidden>
                <span className="ts-hud-rec"><i />REC <span ref={clockRef}>00:00:00:00</span></span>
                <span>Pose lock <span ref={lockRef}>98.4%</span></span>
                <span>30 fps</span>
                <span className="ts-hud-scroll">Scroll <span aria-hidden>↓</span></span>
            </div>

            <style jsx>{`
                .ts {
                    position: relative;
                    min-height: 100vh;
                    min-height: 100svh;
                    display: grid;
                    grid-template-rows: auto 1fr auto;
                    background: #050507;
                    color: #fff;
                    overflow: hidden;
                    isolation: isolate;
                }
                .ts-film {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 40%;
                    filter: grayscale(1) contrast(1.12) brightness(0.5);
                    transform: scale(1.04);
                    z-index: 0;
                    pointer-events: none;
                }
                .ts-veil {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to right, rgba(5, 5, 7, 0.92) 0%, rgba(5, 5, 7, 0.72) 45%, rgba(5, 5, 7, 0.35) 100%), linear-gradient(to top, rgba(5, 5, 7, 0.95) 0%, rgba(5, 5, 7, 0) 40%);
                    z-index: 0;
                    pointer-events: none;
                }
                .ts-grain {
                    position: absolute;
                    inset: -50%;
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
                    opacity: 0.09;
                    mix-blend-mode: overlay;
                    pointer-events: none;
                    animation: ts-grain 0.9s steps(4) infinite;
                    z-index: 1;
                }
                @keyframes ts-grain {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(-2%, 1%); }
                    50% { transform: translate(1%, -2%); }
                    75% { transform: translate(-1%, -1%); }
                    100% { transform: translate(2%, 2%); }
                }

                .ts-nav {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.4rem clamp(1.25rem, 4vw, 3rem);
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.74rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                }
                :global(.ts-brand) {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                    color: #fff;
                    text-decoration: none;
                    font-family: var(--font-display), var(--font-sans);
                    font-weight: 800;
                    font-size: 1.05rem;
                    letter-spacing: 0.02em;
                    text-transform: none;
                }
                :global(.ts-brand) em {
                    font-style: normal;
                    color: var(--brand);
                }
                .ts-nav-links {
                    display: flex;
                    align-items: center;
                    gap: clamp(0.9rem, 2.5vw, 2rem);
                }
                .ts-nav-links :global(a) {
                    color: rgba(255, 255, 255, 0.62);
                    text-decoration: none;
                    transition: color 0.2s ease;
                }
                .ts-nav-links :global(a:hover) {
                    color: #fff;
                }
                .ts-nav-links :global(.ts-cta) {
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    padding: 0.55rem 0.95rem;
                    transition: border-color 0.2s ease, background 0.2s ease;
                }
                .ts-nav-links :global(.ts-cta):hover {
                    border-color: var(--brand);
                    background: var(--brand);
                }

                .ts-corners {
                    position: absolute;
                    inset: 5.2rem clamp(1.25rem, 4vw, 3rem) 4.6rem;
                    pointer-events: none;
                    z-index: 1;
                }
                /* Inside the layered reveal the parent drives --reveal (0 at rest, 1 once the phone has
                   risen): the type, the HUD and the frame give way; the film, the veil and the nav stay. */
                .ts-corners,
                .ts-meta,
                .ts-hud {
                    opacity: calc(1 - var(--reveal, 0));
                }
                .ts-title {
                    opacity: calc(1 - var(--reveal, 0) * 1.25);
                    transform: translate3d(0, calc(var(--reveal, 0) * -6vh), 0);
                    will-change: opacity, transform;
                }
                :global([data-hero='off']) .ts-title,
                :global([data-hero='off']) .ts-hud {
                    pointer-events: none;
                }
                .ts-corners i {
                    position: absolute;
                    width: 22px;
                    height: 22px;
                    border: 0 solid rgba(255, 255, 255, 0.55);
                }
                .ts-corners i:nth-child(1) { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .ts-corners i:nth-child(2) { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .ts-corners i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .ts-corners i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }

                .ts-meta {
                    position: absolute;
                    top: 5.9rem;
                    z-index: 1;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.55);
                }
                .ts-meta--tl { left: calc(clamp(1.25rem, 4vw, 3rem) + 2rem); }
                .ts-meta--tr { right: calc(clamp(1.25rem, 4vw, 3rem) + 2rem); }

                .ts-title {
                    position: relative;
                    z-index: 1;
                    align-self: center;
                    padding: 4rem clamp(1.25rem, 6vw, 5rem) 3rem;
                    max-width: 1400px;
                    width: 100%;
                    margin: 0 auto;
                }
                .ts-line {
                    margin: 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(3.2rem, 11vw, 10.5rem);
                    line-height: 0.94;
                    letter-spacing: -0.02em;
                    color: #fff;
                    opacity: 0;
                    animation: ts-in 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
                    will-change: transform, opacity, filter;
                }
                @keyframes ts-in {
                    from { opacity: 0; transform: translateY(24px); filter: blur(6px); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                .ts-line--em {
                    font-style: italic;
                    color: var(--brand);
                    padding-left: clamp(0rem, 8vw, 9rem);
                }
                .ts-rule {
                    width: min(28rem, 60%);
                    height: 2px;
                    margin: 2.2rem 0 1.6rem;
                    background: var(--brand);
                    transform-origin: left center;
                    transform: scaleX(0);
                    animation: ts-rule 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) 3.1s forwards;
                }
                @keyframes ts-rule {
                    to { transform: scaleX(1); }
                }
                .ts-sub {
                    max-width: 44ch;
                    margin: 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.82rem;
                    letter-spacing: 0.06em;
                    line-height: 1.7;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.7);
                    opacity: 0;
                    animation: ts-fade 1s ease 3.5s forwards;
                }
                @keyframes ts-fade {
                    to { opacity: 1; }
                }
                .ts-actions {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1.4rem;
                    margin-top: 2rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    opacity: 0;
                    animation: ts-fade 0.9s ease 3.9s forwards;
                }
                :global(.ts-btn) {
                    color: #fff;
                    background: var(--brand);
                    padding: 0.95rem 1.6rem;
                    text-decoration: none;
                    transition: background 0.2s ease, transform 0.2s ease;
                }
                :global(.ts-btn):hover {
                    background: #fff;
                    color: #050507;
                }
                .ts-link {
                    color: rgba(255, 255, 255, 0.75);
                    text-decoration: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    padding-bottom: 0.2rem;
                    transition: color 0.2s ease, border-color 0.2s ease;
                }
                .ts-link:hover {
                    color: #fff;
                    border-color: var(--brand);
                }

                .ts-hud {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1.6rem 2.4rem;
                    padding: 1.2rem clamp(1.25rem, 4vw, 3rem) 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.68rem;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.62);
                    font-variant-numeric: tabular-nums;
                }
                .ts-hud-rec {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand);
                }
                .ts-hud-rec i {
                    width: 8px;
                    height: 8px;
                    border-radius: 999px;
                    background: var(--brand);
                    animation: ts-blink 1.4s steps(1) infinite;
                }
                @keyframes ts-blink {
                    50% { opacity: 0.15; }
                }
                .ts-hud-scroll {
                    margin-left: auto;
                    color: #fff;
                    animation: ts-nudge 2.2s ease-in-out infinite;
                }
                @keyframes ts-nudge {
                    50% { transform: translateY(3px); }
                }

                @media (max-width: 700px) {
                    .ts-nav-links a:not(.ts-cta) {
                        display: none;
                    }
                    .ts-meta--tr {
                        display: none;
                    }
                    .ts-line--em {
                        padding-left: 0;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .ts-grain,
                    .ts-hud-scroll,
                    .ts-hud-rec i {
                        animation: none;
                    }
                    .ts-line,
                    .ts-sub,
                    .ts-actions {
                        animation: none;
                        opacity: 1;
                    }
                    .ts-rule {
                        animation: none;
                        transform: none;
                    }
                }
            `}</style>
        </section>
    );
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}
