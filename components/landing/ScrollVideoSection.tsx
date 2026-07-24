'use client';

import { useEffect, useRef, useState } from 'react';

type LayerKey = 'img1' | 'v1' | 'img2' | 'v2' | 'img3' | 'v3' | 'img4' | 'img5';

const ANCHORS: { caption: string; sub: string }[] = [
    { caption: 'Walk into the gym.', sub: 'Same plan, same doubts. Is the form right?' },
    { caption: 'Set up your phone.', sub: 'One camera. No wires. No coach standing over you.' },
    { caption: 'Hit record.', sub: 'SHaiPT starts watching the moment you do.' },
    { caption: 'Move.', sub: 'Every rep is tracked. Every angle is measured.' },
    { caption: 'See every rep.', sub: 'Skeleton overlay, live tempo, real depth. Right on your phone.' },
];

const SEGMENTS: { layer: LayerKey; start: number; end: number }[] = [
    { layer: 'img1', start: 0.00, end: 0.10 },
    { layer: 'v1', start: 0.10, end: 0.25 },
    { layer: 'img2', start: 0.25, end: 0.35 },
    { layer: 'v2', start: 0.35, end: 0.50 },
    { layer: 'img3', start: 0.50, end: 0.60 },
    { layer: 'v3', start: 0.60, end: 0.75 },
    { layer: 'img4', start: 0.75, end: 0.88 },
    { layer: 'img5', start: 0.88, end: 1.01 },
];

const CAPTION_BANDS = [0, 0.175, 0.42, 0.665, 0.87, 1.01];

const BRAND = 'var(--brand)';

export default function ScrollVideoSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const layerRefs = useRef<Record<LayerKey, HTMLElement | null>>({
        img1: null, v1: null, img2: null, v2: null, img3: null, v3: null, img4: null, img5: null,
    });
    const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const v1Ref = useRef<HTMLVideoElement | null>(null);
    const v2Ref = useRef<HTMLVideoElement | null>(null);
    const v3Ref = useRef<HTMLVideoElement | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const section = sectionRef.current;
        if (!section) return;

        if (prefersReduced) {
            // Reduced-motion: only show the final phone-mockup frame; no scroll behavior.
            setActive(true);
            const finalLayer = layerRefs.current.img5;
            if (finalLayer) finalLayer.style.opacity = '1';
            const finalCaption = captionRefs.current[4];
            if (finalCaption) {
                finalCaption.style.opacity = '1';
                finalCaption.style.transform = 'translateY(0)';
            }
            return;
        }

        let raf = 0;
        let lastProgress = -1;
        let lastActive: boolean | null = null;

        const update = () => {
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;
            const inView = rect.bottom > 0 && rect.top < vh;
            if (inView !== lastActive) {
                lastActive = inView;
                setActive(inView);
            }
            const total = section.offsetHeight - vh;
            const scrolled = Math.max(0, Math.min(total, -rect.top));
            const progress = total > 0 ? scrolled / total : 0;

            if (Math.abs(progress - lastProgress) < 0.0005) return;
            lastProgress = progress;

            const v1 = v1Ref.current;
            const v2 = v2Ref.current;
            const v3 = v3Ref.current;
            if (v1 && v1.duration && Number.isFinite(v1.duration)) {
                const p = clamp((progress - 0.10) / 0.15, 0, 1);
                const t = Math.min(p * v1.duration, v1.duration - 0.001);
                if (Math.abs((v1.currentTime || 0) - t) > 0.01) v1.currentTime = t;
            }
            if (v2 && v2.duration && Number.isFinite(v2.duration)) {
                const p = clamp((progress - 0.35) / 0.15, 0, 1);
                const t = Math.min(p * v2.duration, v2.duration - 0.001);
                if (Math.abs((v2.currentTime || 0) - t) > 0.01) v2.currentTime = t;
            }
            if (v3 && v3.duration && Number.isFinite(v3.duration)) {
                const p = clamp((progress - 0.60) / 0.15, 0, 1);
                const t = Math.min(p * v3.duration, v3.duration - 0.001);
                if (Math.abs((v3.currentTime || 0) - t) > 0.01) v3.currentTime = t;
            }

            const FADE = 0.02;
            (Object.keys(layerRefs.current) as LayerKey[]).forEach((key) => {
                const el = layerRefs.current[key];
                if (!el) return;
                const seg = SEGMENTS.find((s) => s.layer === key)!;
                el.style.opacity = String(segmentOpacity(progress, seg.start, seg.end, FADE));
            });

            const activeCaption = CAPTION_BANDS.findIndex(
                (lo, i) => i < CAPTION_BANDS.length - 1 && progress >= lo && progress < CAPTION_BANDS[i + 1]
            );
            captionRefs.current.forEach((el, i) => {
                if (!el) return;
                const isActive = i === activeCaption;
                el.style.opacity = isActive ? '1' : '0';
                el.style.transform = isActive ? 'translateY(0)' : 'translateY(10px)';
            });

            if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${progress})`;
            }
        };

        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                update();
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        update();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    const setRef = (key: LayerKey) => (el: HTMLElement | null) => {
        layerRefs.current[key] = el;
    };
    const setCaption = (i: number) => (el: HTMLDivElement | null) => {
        captionRefs.current[i] = el;
    };

    return (
        <>
            {/* Outer spacer — establishes scroll length for the pinned stage. */}
            <section
                ref={sectionRef}
                aria-label="How SHaiPT works"
                style={{
                    position: 'relative',
                    height: '700vh',
                    background: 'var(--surface-0)',
                    zIndex: 1,
                }}
            />

            {/* Fixed pinned stage — only visible while the section is in viewport. */}
            <div
                ref={stageRef}
                aria-hidden={!active}
                style={{
                    position: 'fixed',
                    inset: 0,
                    height: '100vh',
                    width: '100%',
                    overflow: 'hidden',
                    background: 'var(--surface-0)',
                    pointerEvents: 'none',
                    opacity: active ? 1 : 0,
                    visibility: active ? 'visible' : 'hidden',
                    transition: 'opacity 0.2s linear',
                    zIndex: 5,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 'max(2rem, env(safe-area-inset-top))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 30,
                        fontSize: '0.72rem',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: BRAND,
                        fontFamily: 'var(--font-display), var(--font-sans)',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                    }}
                >
                    From rep one to rep done
                </div>

                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div className="shaipt-stage">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img1')} src="/storyboard/1.png" alt="" className="shaipt-layer" style={{ opacity: 1 }} decoding="async" loading="eager" />
                        <video
                            ref={(el) => { layerRefs.current.v1 = el; v1Ref.current = el; }}
                            src="/storyboard/1_to_2.mp4"
                            className="shaipt-layer"
                            style={{ opacity: 0 }}
                            muted
                            playsInline
                            preload="auto"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img2')} src="/storyboard/2.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" />
                        <video
                            ref={(el) => { layerRefs.current.v2 = el; v2Ref.current = el; }}
                            src="/storyboard/2_to_3.mp4"
                            className="shaipt-layer"
                            style={{ opacity: 0 }}
                            muted
                            playsInline
                            preload="auto"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img3')} src="/storyboard/3.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" />
                        <video
                            ref={(el) => { layerRefs.current.v3 = el; v3Ref.current = el; }}
                            src="/storyboard/3_to_4.mp4"
                            className="shaipt-layer"
                            style={{ opacity: 0 }}
                            muted
                            playsInline
                            preload="auto"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img4')} src="/storyboard/4.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img5')} src="/storyboard/5.png" alt="SHaiPT pose analysis on a phone" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" />
                    </div>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 'max(4rem, env(safe-area-inset-bottom))',
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '0 1.5rem',
                        zIndex: 20,
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '720px', width: '100%', minHeight: '8rem' }}>
                        {ANCHORS.map((a, i) => (
                            <div
                                key={i}
                                ref={setCaption(i)}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: i === 0 ? 1 : 0,
                                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                                    textAlign: 'center',
                                    color: 'var(--ink-hi)',
                                    willChange: 'opacity, transform',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 'clamp(1.75rem, 4.5vw, 3rem)',
                                        fontWeight: 800,
                                        lineHeight: 1.05,
                                        letterSpacing: '-0.02em',
                                        marginBottom: '0.75rem',
                                        color: 'var(--ink-hi)',
                                        textShadow: '0 2px 24px rgba(0,0,0,0.6)',
                                    }}
                                >
                                    {a.caption}
                                </div>
                                <div
                                    style={{
                                        fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
                                        color: 'var(--ink-mid)',
                                        maxWidth: '540px',
                                        margin: '0 auto',
                                        lineHeight: 1.5,
                                        textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    {a.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '2px',
                        background: 'var(--line-soft)',
                        zIndex: 25,
                    }}
                >
                    <div
                        ref={progressBarRef}
                        style={{
                            height: '100%',
                            background: 'var(--brand-gradient)',
                            boxShadow: '0 0 10px var(--brand-glow)',
                            transformOrigin: 'left center',
                            transform: 'scaleX(0)',
                            willChange: 'transform',
                        }}
                    />
                </div>
            </div>

            <style jsx>{`
                .shaipt-stage {
                    position: relative;
                    width: min(90vw, 56vh);
                    aspect-ratio: 720 / 898;
                    max-height: 86vh;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
                    background: var(--surface-0);
                }
                .shaipt-layer {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    will-change: opacity;
                }
                @media (max-width: 640px) {
                    .shaipt-stage {
                        width: 86vw;
                        max-height: 70vh;
                    }
                }
            `}</style>
        </>
    );
}

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

function segmentOpacity(progress: number, start: number, end: number, fade: number) {
    if (progress < start - fade || progress > end + fade) return 0;
    if (progress < start) return (progress - (start - fade)) / fade;
    if (progress > end) return 1 - (progress - end) / fade;
    return 1;
}
