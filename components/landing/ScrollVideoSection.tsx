'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

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

/**
 * Split scroll-storyboard.
 *
 * Layout: the video stage is pinned (position: sticky) in the LEFT column and
 * stays vertically centred while `children` — the hero copy, app showcase and
 * features — scroll down the RIGHT column. The right column's natural height is
 * what drives the scroll track, so the section no longer needs a fixed 700vh
 * spacer.
 *
 * The scrub/cross-fade mapping below (progress -> currentTime / opacity) is
 * unchanged from the centred version; only positioning moved.
 */
export default function ScrollVideoSection({ children }: { children?: ReactNode }) {
    const sectionRef = useRef<HTMLDivElement>(null);
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

        // The scrub above no-ops while `video.duration` is still NaN. Without
        // this, a clip whose metadata lands after the user has already scrolled
        // past its band stays parked on frame 0 until the next scroll event.
        const videos = [v1Ref.current, v2Ref.current, v3Ref.current].filter(
            (v): v is HTMLVideoElement => Boolean(v)
        );
        const onMeta = () => {
            lastProgress = -1; // defeat the no-op guard so the scrub re-runs
            update();
        };
        videos.forEach((v) => {
            v.addEventListener('loadedmetadata', onMeta);
            // preload="auto" alone is only a hint, and Chrome defers it for
            // these (they are opacity:0 and never play). Without an explicit
            // load() the clips can sit at readyState 0 indefinitely, so
            // `duration` stays NaN and the scrub never engages.
            if (v.readyState === 0) v.load();
        });

        update();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            videos.forEach((v) => v.removeEventListener('loadedmetadata', onMeta));
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
        <section ref={sectionRef} aria-label="How SHaiPT works" className="sb-split">
            {/* LEFT — pinned video stage, vertically centred for the scroll track. */}
            <div className="sb-pin">
                <div className="sb-eyebrow">From rep one to rep done</div>

                <div className="sb-stage-wrap" aria-hidden={!active}>
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

                    {/* Captions: overlaid on the stage at desktop, stacked beneath it on mobile. */}
                    <div className="sb-captions">
                        {ANCHORS.map((a, i) => (
                            <div key={i} ref={setCaption(i)} className="sb-caption" style={{ opacity: i === 0 ? 1 : 0 }}>
                                <div className="sb-caption-title">{a.caption}</div>
                                <div className="sb-caption-sub">{a.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sb-progress">
                    <div ref={progressBarRef} className="sb-progress-fill" />
                </div>
            </div>

            {/* RIGHT — normal-flow content that drives the scroll track. */}
            <div className="sb-flow">{children}</div>

            <style jsx>{`
                .sb-split {
                    position: relative;
                    z-index: 1;
                    background: transparent;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    align-items: start;
                    /* Floor so there is always scrub room even if the right
                       column is short; content taller than this extends it. */
                    min-height: 320vh;
                }

                .sb-pin {
                    position: sticky;
                    top: 0;
                    align-self: start;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1.25rem;
                    padding: max(2rem, env(safe-area-inset-top)) 1.5rem 2rem;
                    overflow: hidden;
                    pointer-events: none;
                }

                .sb-eyebrow {
                    font-size: 0.72rem;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: ${BRAND};
                    font-family: var(--font-display), var(--font-sans);
                    font-weight: 700;
                    white-space: nowrap;
                }

                .sb-stage-wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-height: 0;
                }

                .shaipt-stage {
                    position: relative;
                    width: min(40vw, 60vh);
                    aspect-ratio: 720 / 898;
                    max-height: 74vh;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
                    /* Transparent phone frame — the opaque storyboard frames fill it;
                       lines show through only during crossfades. */
                    background: transparent;
                }

                .shaipt-layer {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    will-change: opacity;
                }

                /* Desktop: captions overlay the bottom of the video card. */
                .sb-captions {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    min-height: 8rem;
                    padding: 0 1rem 1.25rem;
                    background: linear-gradient(to top, rgba(8, 8, 12, 0.88) 0%, rgba(8, 8, 12, 0.6) 55%, rgba(8, 8, 12, 0) 100%);
                    border-radius: 0 0 18px 18px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }

                .sb-caption {
                    position: absolute;
                    left: 1rem;
                    right: 1rem;
                    bottom: 1.25rem;
                    transition: opacity 0.35s ease, transform 0.35s ease;
                    text-align: center;
                    color: var(--ink-hi);
                    will-change: opacity, transform;
                }

                .sb-caption-title {
                    font-size: clamp(1.35rem, 2.2vw, 2.1rem);
                    font-weight: 800;
                    line-height: 1.08;
                    letter-spacing: -0.02em;
                    margin-bottom: 0.5rem;
                    color: var(--ink-hi);
                    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.85);
                }

                .sb-caption-sub {
                    font-size: clamp(0.9rem, 1.1vw, 1.05rem);
                    color: var(--ink-mid);
                    max-width: 34ch;
                    margin: 0 auto;
                    line-height: 1.5;
                    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
                }

                .sb-progress {
                    width: min(40vw, 60vh);
                    height: 2px;
                    background: var(--line-soft);
                    flex: none;
                }

                .sb-progress-fill {
                    height: 100%;
                    background: var(--brand-gradient);
                    box-shadow: 0 0 10px var(--brand-glow);
                    transform-origin: left center;
                    transform: scaleX(0);
                    will-change: transform;
                }

                .sb-flow {
                    min-width: 0;
                }

                /* ── Stacked fallback ─────────────────────────────────────────
                   Below the md: breakpoint the split has too little room, so the
                   grid collapses to one column: video on top, captions beneath
                   it, then the content. Nothing is pinned, so nothing overlaps. */
                @media (max-width: 900px) {
                    .sb-split {
                        grid-template-columns: 1fr;
                        min-height: 0;
                    }

                    .sb-pin {
                        position: static;
                        height: auto;
                        padding: 3rem 1rem 1.5rem;
                        gap: 1rem;
                    }

                    .shaipt-stage {
                        width: min(86vw, 52vh);
                        max-height: 60vh;
                    }

                    .sb-captions {
                        position: static;
                        min-height: 9rem;
                        width: min(86vw, 40rem);
                        margin-top: 1.25rem;
                        padding: 0 0.5rem;
                        background: none;
                        border-radius: 0;
                        align-items: flex-start;
                    }

                    .sb-caption {
                        left: 0.5rem;
                        right: 0.5rem;
                        bottom: auto;
                        top: 0;
                    }

                    .sb-caption-title {
                        font-size: clamp(1.5rem, 6vw, 2.25rem);
                    }

                    .sb-caption-sub {
                        font-size: clamp(0.95rem, 3.4vw, 1.1rem);
                        max-width: none;
                    }

                    .sb-progress {
                        width: min(86vw, 40rem);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .sb-caption {
                        transition: none;
                    }
                }
            `}</style>
        </section>
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
