'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useFourDcoachUrl } from '@/lib/fourDcoach';

type LayerKey = 'img1' | 'v1' | 'img2' | 'v2' | 'img3' | 'v3' | 'img4' | 'img5';

const ANCHORS: { caption: string; sub: string }[] = [
    { caption: 'Walk into the gym.', sub: 'Same plan, same doubts. Is the form right?' },
    { caption: 'Set up your phone.', sub: 'One camera. No wires. No coach standing over you.' },
    { caption: 'Hit record.', sub: 'SHaiPT starts watching the moment you do.' },
    { caption: 'Move.', sub: 'Every rep is tracked. Every angle is measured.' },
    { caption: 'See every rep.', sub: 'Skeleton overlay, live tempo, real depth. Right on your phone.' },
];

const SEGMENTS: { layer: LayerKey; start: number; end: number }[] = [
    { layer: 'img1', start: 0.0, end: 0.1 },
    { layer: 'v1', start: 0.1, end: 0.25 },
    { layer: 'img2', start: 0.25, end: 0.35 },
    { layer: 'v2', start: 0.35, end: 0.5 },
    { layer: 'img3', start: 0.5, end: 0.6 },
    { layer: 'v3', start: 0.6, end: 0.75 },
    { layer: 'img4', start: 0.75, end: 0.88 },
    { layer: 'img5', start: 0.88, end: 1.01 },
];

const CAPTION_BANDS = [0, 0.175, 0.42, 0.665, 0.87, 1.01];

/** The five stills are where the scroll comes to rest (the "scroll stops"): one per caption. */
const HOLDS = SEGMENTS.filter((s) => s.layer.startsWith('img')).map((s) => {
    const end = Math.min(s.end, 1);
    return { start: s.start, end, mid: (s.start + end) / 2 };
});

const BRAND = 'var(--brand)';

/**
 * Split scroll-storyboard with scroll stops.
 *
 * Layout: the video stage is pinned (position: sticky) in the LEFT column and
 * stays vertically centred while `children` — the hero copy, app showcase and
 * features — scroll down the RIGHT column. The right column's natural height is
 * what drives the scroll track.
 *
 * Scroll progress scrubs three transition clips between five stills. On top of
 * that the stage is interactive:
 *  - scroll stops: when scrolling settles inside a still, the page eases to the
 *    centre of that beat, so every stop lands on a clean frame and its caption;
 *  - a beat rail (five dots) jumps between the stops; ← → do the same;
 *  - the stage can be dragged sideways to scrub the storyboard (touch too);
 *  - the stage tilts toward the pointer with a light sheen;
 *  - a live HUD (reps, tempo, depth, form score) plays over the last two beats,
 *    driven by the same progress, and the final beat offers the 4D replay.
 */
export default function ScrollVideoSection({ children }: { children?: ReactNode }) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const sheenRef = useRef<HTMLDivElement>(null);
    const layerRefs = useRef<Record<LayerKey, HTMLElement | null>>({
        img1: null, v1: null, img2: null, v2: null, img3: null, v3: null, img4: null, img5: null,
    });
    const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const railRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const v1Ref = useRef<HTMLVideoElement | null>(null);
    const v2Ref = useRef<HTMLVideoElement | null>(null);
    const v3Ref = useRef<HTMLVideoElement | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const hudRepRef = useRef<HTMLSpanElement>(null);
    const hudPhaseRef = useRef<HTMLSpanElement>(null);
    const hudTempoRef = useRef<HTMLSpanElement>(null);
    const hudDepthRef = useRef<HTMLDivElement>(null);
    const hudScoreRef = useRef<HTMLSpanElement>(null);
    const hudRingRef = useRef<SVGCircleElement>(null);
    const hintRef = useRef<HTMLDivElement>(null);
    const indexRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const fourD = useFourDcoachUrl();

    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const section = sectionRef.current;
        const stage = stageRef.current;
        if (!section || !stage) return;

        if (prefersReduced) {
            // Reduced-motion: only show the final phone-mockup frame; no scroll behavior.
            wrapRef.current?.setAttribute('aria-hidden', 'false');
            const finalLayer = layerRefs.current.img5;
            if (finalLayer) finalLayer.style.opacity = '1';
            const finalCaption = captionRefs.current[4];
            if (finalCaption) {
                finalCaption.style.opacity = '1';
                finalCaption.style.transform = 'translateY(0)';
            }
            if (hudRef.current) hudRef.current.style.opacity = '1';
            return;
        }

        let raf = 0;
        let lastProgress = -1;
        let lastActive: boolean | null = null;
        let progress = 0;
        let inView = false;
        let dragging = false;
        let settleTimer = 0;
        let programmaticUntil = 0;
        let hintShown = false;

        const track = () => {
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = section.offsetHeight - vh;
            return { top: rect.top + window.scrollY, total, vh, rect };
        };
        const pinned = () => window.matchMedia('(min-width: 901px)').matches;
        const scrollToProgress = (p: number, behavior: ScrollBehavior = 'smooth') => {
            const { top, total } = track();
            programmaticUntil = performance.now() + 900;
            window.scrollTo({ top: top + Math.max(0, Math.min(1, p)) * total, behavior });
        };

        const update = () => {
            const { rect, vh, total } = track();
            inView = rect.bottom > 0 && rect.top < vh;
            if (inView !== lastActive) {
                lastActive = inView;
                wrapRef.current?.setAttribute('aria-hidden', String(!inView));
            }
            const scrolled = Math.max(0, Math.min(total, -rect.top));
            progress = total > 0 ? scrolled / total : 0;

            if (Math.abs(progress - lastProgress) < 0.0005) return;
            lastProgress = progress;

            const v1 = v1Ref.current;
            const v2 = v2Ref.current;
            const v3 = v3Ref.current;
            if (v1 && v1.duration && Number.isFinite(v1.duration)) {
                const p = clamp((progress - 0.1) / 0.15, 0, 1);
                const t = Math.min(p * v1.duration, v1.duration - 0.001);
                if (Math.abs((v1.currentTime || 0) - t) > 0.01) v1.currentTime = t;
            }
            if (v2 && v2.duration && Number.isFinite(v2.duration)) {
                const p = clamp((progress - 0.35) / 0.15, 0, 1);
                const t = Math.min(p * v2.duration, v2.duration - 0.001);
                if (Math.abs((v2.currentTime || 0) - t) > 0.01) v2.currentTime = t;
            }
            if (v3 && v3.duration && Number.isFinite(v3.duration)) {
                const p = clamp((progress - 0.6) / 0.15, 0, 1);
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

            const beat = CAPTION_BANDS.findIndex(
                (lo, i) => i < CAPTION_BANDS.length - 1 && progress >= lo && progress < CAPTION_BANDS[i + 1],
            );
            captionRefs.current.forEach((el, i) => {
                if (!el) return;
                const isActive = i === beat;
                el.style.opacity = isActive ? '1' : '0';
                el.style.transform = isActive ? 'translateY(0)' : 'translateY(10px)';
            });
            railRefs.current.forEach((el, i) => {
                if (!el) return;
                el.classList.toggle('is-active', i === beat);
                el.classList.toggle('is-past', i < beat);
            });
            if (indexRef.current) indexRef.current.textContent = `${String(Math.max(0, beat) + 1).padStart(2, '0')} / ${String(ANCHORS.length).padStart(2, '0')}`;

            if (progressBarRef.current) {
                progressBarRef.current.style.transform = `scaleX(${progress})`;
            }

            // Live HUD over "Move." and "See every rep.": five reps play out with the scroll.
            const hud = hudRef.current;
            if (hud) {
                const lo = CAPTION_BANDS[3];
                const hi = CAPTION_BANDS[5];
                const local = clamp((progress - lo) / (hi - lo), 0, 1);
                const show = progress >= lo - 0.02;
                hud.style.opacity = show ? '1' : '0';
                hud.style.transform = show ? 'translateY(0)' : 'translateY(-8px)';
                if (show) {
                    const reps = 5;
                    const x = local * reps;
                    const rep = Math.min(reps, 1 + Math.floor(x));
                    const phase = x - Math.floor(x); // 0 → 1 inside a rep: down, then up
                    const down = phase < 0.55;
                    const depth = down ? phase / 0.55 : 1 - (phase - 0.55) / 0.45;
                    if (hudRepRef.current) hudRepRef.current.textContent = `${local >= 1 ? reps : rep}`;
                    if (hudPhaseRef.current) hudPhaseRef.current.textContent = local >= 1 ? 'set done' : down ? 'down' : 'up';
                    if (hudTempoRef.current) hudTempoRef.current.textContent = `${(2.6 + 0.25 * (rep - 1)).toFixed(1)} s down · ${(1.1 + 0.15 * (rep - 1)).toFixed(1)} s up`;
                    if (hudDepthRef.current) hudDepthRef.current.style.transform = `scaleX(${local >= 1 ? 1 : Math.max(0.04, depth)})`;
                    const score = Math.round(62 + 30 * local);
                    if (hudScoreRef.current) hudScoreRef.current.textContent = `${score}`;
                    if (hudRingRef.current) hudRingRef.current.style.strokeDashoffset = String(100 - score);
                }
            }

            if (!hintShown && progress > 0.03 && hintRef.current) {
                hintShown = true;
                hintRef.current.classList.add('is-shown');
                window.setTimeout(() => hintRef.current?.classList.remove('is-shown'), 3200);
            }
        };

        // Scroll stops: when the scroll settles inside a still, ease onto that beat's centre.
        const settle = () => {
            if (!inView || dragging || !pinned() || performance.now() < programmaticUntil) return;
            const hold = HOLDS.find((h) => progress >= h.start && progress < h.end);
            if (!hold) return;
            if (Math.abs(progress - hold.mid) < 0.004) return;
            scrollToProgress(hold.mid);
        };
        const onScroll = () => {
            if (!raf) {
                raf = requestAnimationFrame(() => {
                    raf = 0;
                    update();
                });
            }
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(settle, 180);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        // Beat rail and keyboard: jump between the stops.
        const jump = (dir: 1 | -1) => {
            const i = HOLDS.findIndex((h) => progress < h.mid - 0.004);
            const next = dir > 0 ? (i < 0 ? HOLDS.length - 1 : i) : Math.max(0, (i < 0 ? HOLDS.length : i) - 1);
            scrollToProgress(HOLDS[next].mid);
        };
        const onKey = (e: KeyboardEvent) => {
            if (!inView || !pinned()) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                jump(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                jump(-1);
            }
        };
        window.addEventListener('keydown', onKey);
        const rail = railRefs.current.slice();
        const railClicks = rail.map((el, i) => {
            const fn = () => scrollToProgress(HOLDS[i].mid);
            el?.addEventListener('click', fn);
            return fn;
        });

        // Drag to scrub: a sideways drag over the stage moves the storyboard (and the page with it).
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartScroll = 0;
        let dragMoved = false;
        const onDown = (e: PointerEvent) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging = true;
            dragMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartScroll = window.scrollY;
            stage.classList.add('is-dragging');
        };
        const onMove = (e: PointerEvent) => {
            if (dragging) {
                const dx = e.clientX - dragStartX;
                const dy = e.clientY - dragStartY;
                if (!dragMoved && Math.abs(dx) < 6) {
                    if (Math.abs(dy) > 12) {
                        // a vertical gesture is a normal scroll
                        dragging = false;
                        stage.classList.remove('is-dragging');
                    }
                    return;
                }
                if (!dragMoved && Math.abs(dy) > Math.abs(dx) * 1.5) {
                    // a vertical gesture is a normal scroll
                    dragging = false;
                    stage.classList.remove('is-dragging');
                    return;
                }
                dragMoved = true;
                stage.setPointerCapture?.(e.pointerId);
                const { total } = track();
                const width = stage.getBoundingClientRect().width || 1;
                programmaticUntil = performance.now() + 300;
                window.scrollTo({ top: dragStartScroll + (dx / width) * total * 0.6, behavior: 'auto' });
                return;
            }
            // tilt toward the pointer, with the sheen following it
            if (e.pointerType !== 'mouse') return;
            const r = stage.getBoundingClientRect();
            const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
            const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
            stage.style.transform = `perspective(1200px) rotateY(${(nx * 6).toFixed(2)}deg) rotateX(${(-ny * 4).toFixed(2)}deg)`;
            if (sheenRef.current) {
                sheenRef.current.style.opacity = '1';
                sheenRef.current.style.background = `radial-gradient(420px circle at ${((nx + 1) * 50).toFixed(1)}% ${((ny + 1) * 50).toFixed(1)}%, rgba(255,255,255,0.14), rgba(255,255,255,0) 60%)`;
            }
        };
        const endDrag = (e: PointerEvent) => {
            if (dragging) {
                dragging = false;
                stage.classList.remove('is-dragging');
                if (stage.hasPointerCapture?.(e.pointerId)) stage.releasePointerCapture(e.pointerId);
                programmaticUntil = 0; // the drag's own guard must not block the stop after it
                window.clearTimeout(settleTimer);
                settleTimer = window.setTimeout(settle, 120);
            }
        };
        const onLeave = () => {
            stage.style.transform = '';
            if (sheenRef.current) sheenRef.current.style.opacity = '0';
        };
        stage.addEventListener('pointerdown', onDown);
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', endDrag);
        stage.addEventListener('pointercancel', endDrag);
        stage.addEventListener('pointerleave', onLeave);

        // The scrub above no-ops while `video.duration` is still NaN. Without
        // this, a clip whose metadata lands after the user has already scrolled
        // past its band stays parked on frame 0 until the next scroll event.
        const videos = [v1Ref.current, v2Ref.current, v3Ref.current].filter(
            (v): v is HTMLVideoElement => Boolean(v),
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
            window.removeEventListener('keydown', onKey);
            rail.forEach((el, i) => el?.removeEventListener('click', railClicks[i]));
            stage.removeEventListener('pointerdown', onDown);
            stage.removeEventListener('pointermove', onMove);
            stage.removeEventListener('pointerup', endDrag);
            stage.removeEventListener('pointercancel', endDrag);
            stage.removeEventListener('pointerleave', onLeave);
            videos.forEach((v) => v.removeEventListener('loadedmetadata', onMeta));
            window.clearTimeout(settleTimer);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    const setRef = (key: LayerKey) => (el: HTMLElement | null) => {
        layerRefs.current[key] = el;
    };
    const setCaption = (i: number) => (el: HTMLDivElement | null) => {
        captionRefs.current[i] = el;
    };
    const setRail = (i: number) => (el: HTMLButtonElement | null) => {
        railRefs.current[i] = el;
    };

    return (
        <section ref={sectionRef} aria-label="How SHaiPT works" className="sb-split">
            {/* LEFT — pinned video stage, vertically centred for the scroll track. */}
            <div className="sb-pin">
                <div className="sb-eyebrow">Chapter reel — from rep one to rep done</div>

                <div ref={wrapRef} className="sb-stage-wrap" aria-hidden="true">
                    <div ref={stageRef} className="shaipt-stage" title="Drag sideways to scrub">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img1')} src="/storyboard/1.png" alt="" className="shaipt-layer" style={{ opacity: 1 }} decoding="async" loading="eager" draggable={false} />
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
                        <img ref={setRef('img2')} src="/storyboard/2.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" draggable={false} />
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
                        <img ref={setRef('img3')} src="/storyboard/3.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" draggable={false} />
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
                        <img ref={setRef('img4')} src="/storyboard/4.png" alt="" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" draggable={false} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={setRef('img5')} src="/storyboard/5.png" alt="SHaiPT pose analysis on a phone" className="shaipt-layer" style={{ opacity: 0 }} decoding="async" draggable={false} />

                        <div ref={sheenRef} className="sb-sheen" aria-hidden />

                        {/* Live HUD: the numbers the app shows, played by the scroll. */}
                        <div ref={hudRef} className="sb-hud" aria-hidden>
                            <div className="sb-hud-row">
                                <div className="sb-hud-rep">
                                    <span ref={hudRepRef} className="sb-hud-big">1</span>
                                    <span className="sb-hud-k">rep</span>
                                </div>
                                <span ref={hudPhaseRef} className="sb-hud-phase">down</span>
                            </div>
                            <div className="sb-hud-depth"><div ref={hudDepthRef} className="sb-hud-depth-fill" /></div>
                            <div className="sb-hud-row sb-hud-meta">
                                <span ref={hudTempoRef}>2.6 s down · 1.1 s up</span>
                                <span className="sb-hud-score">
                                    <svg viewBox="0 0 36 36" className="sb-hud-ring" aria-hidden>
                                        <circle cx="18" cy="18" r="15.9" className="sb-hud-ring-bg" />
                                        <circle ref={hudRingRef} cx="18" cy="18" r="15.9" className="sb-hud-ring-fg" style={{ strokeDashoffset: 38 }} />
                                    </svg>
                                    <span ref={hudScoreRef}>62</span>
                                </span>
                            </div>
                        </div>

                        <div ref={hintRef} className="sb-hint" aria-hidden>Scroll, drag, or use ← →</div>

                        {/* HUD framing: corner brackets, centre ticks, chapter index. */}
                        <div className="sb-frame" aria-hidden>
                            <i className="sb-corner sb-corner--tl" /><i className="sb-corner sb-corner--tr" /><i className="sb-corner sb-corner--bl" /><i className="sb-corner sb-corner--br" />
                            <i className="sb-tick sb-tick--l" /><i className="sb-tick sb-tick--r" /><i className="sb-tick sb-tick--t" /><i className="sb-tick sb-tick--b" />
                            <div ref={indexRef} className="sb-index">01 / 05</div>
                            <div className="sb-rec"><i />REC</div>
                        </div>
                    </div>

                    {/* Beat rail: one stop per caption. */}
                    <div className="sb-rail" role="tablist" aria-label="Storyboard beats">
                        {ANCHORS.map((a, i) => (
                            <button key={i} ref={setRail(i)} type="button" role="tab" className={`sb-dot${i === 0 ? ' is-active' : ''}`} aria-label={a.caption} title={a.caption}>
                                <span className="sb-dot-label">{a.caption}</span>
                            </button>
                        ))}
                    </div>

                    {/* Captions: overlaid on the stage at desktop, stacked beneath it on mobile. */}
                    <div className="sb-captions">
                        {ANCHORS.map((a, i) => (
                            <div key={i} ref={setCaption(i)} className="sb-caption" style={{ opacity: i === 0 ? 1 : 0 }}>
                                <div className="sb-caption-title">{a.caption}</div>
                                <div className="sb-caption-sub">{a.sub}</div>
                                {i === ANCHORS.length - 1 && (
                                    <a className="sb-cta" href={fourD}>
                                        Try the 4D replay
                                        <span aria-hidden>→</span>
                                    </a>
                                )}
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
                    pointer-events: auto;
                }

                .shaipt-stage {
                    position: relative;
                    width: min(40vw, 60vh);
                    aspect-ratio: 720 / 898;
                    max-height: 74vh;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.14);
                    /* Transparent phone frame — the opaque storyboard frames fill it;
                       lines show through only during crossfades. */
                    background: transparent;
                    cursor: grab;
                    touch-action: pan-y;
                    user-select: none;
                    -webkit-user-select: none;
                    transition: transform 0.35s ease, box-shadow 0.35s ease;
                }
                .shaipt-stage.is-dragging {
                    cursor: grabbing;
                    transition: none;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--brand-glow), 0 0 40px var(--brand-glow-soft);
                }

                .shaipt-layer {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    will-change: opacity;
                    pointer-events: none;
                }

                .sb-frame {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.16em;
                    color: rgba(255, 255, 255, 0.72);
                }
                .sb-corner {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border: 0 solid rgba(255, 255, 255, 0.85);
                }
                .sb-corner--tl { top: 10px; left: 10px; border-top-width: 1px; border-left-width: 1px; }
                .sb-corner--tr { top: 10px; right: 10px; border-top-width: 1px; border-right-width: 1px; }
                .sb-corner--bl { bottom: 10px; left: 10px; border-bottom-width: 1px; border-left-width: 1px; }
                .sb-corner--br { bottom: 10px; right: 10px; border-bottom-width: 1px; border-right-width: 1px; }
                .sb-tick {
                    position: absolute;
                    background: rgba(255, 255, 255, 0.5);
                }
                .sb-tick--l { left: 10px; top: 50%; width: 10px; height: 1px; }
                .sb-tick--r { right: 10px; top: 50%; width: 10px; height: 1px; }
                .sb-tick--t { top: 10px; left: 50%; width: 1px; height: 10px; }
                .sb-tick--b { bottom: 10px; left: 50%; width: 1px; height: 10px; }
                .sb-index {
                    position: absolute;
                    right: 1.1rem;
                    bottom: 1.05rem;
                    font-variant-numeric: tabular-nums;
                }
                .sb-rec {
                    position: absolute;
                    left: 1.1rem;
                    bottom: 1.05rem;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    color: ${BRAND};
                }
                .sb-rec i {
                    width: 7px;
                    height: 7px;
                    border-radius: 999px;
                    background: ${BRAND};
                    box-shadow: 0 0 8px var(--brand-glow);
                    animation: sb-blink 1.4s steps(1) infinite;
                }
                @keyframes sb-blink {
                    50% { opacity: 0.15; }
                }

                .sb-sheen {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    pointer-events: none;
                    mix-blend-mode: screen;
                }

                /* Live HUD chip, top-left of the stage. */
                .sb-hud {
                    position: absolute;
                    top: 0.9rem;
                    left: 0.9rem;
                    width: min(62%, 15rem);
                    padding: 0.7rem 0.85rem;
                    border-radius: 14px;
                    background: rgba(8, 8, 12, 0.66);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    color: var(--ink-hi);
                    opacity: 0;
                    transform: translateY(-8px);
                    transition: opacity 0.35s ease, transform 0.35s ease;
                    pointer-events: none;
                    font-family: var(--font-sans);
                }
                .sb-hud-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                }
                .sb-hud-rep {
                    display: flex;
                    align-items: baseline;
                    gap: 0.35rem;
                }
                .sb-hud-big {
                    font-size: 1.7rem;
                    font-weight: 800;
                    line-height: 1;
                    letter-spacing: -0.02em;
                    font-variant-numeric: tabular-nums;
                }
                .sb-hud-k {
                    font-size: 0.7rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--ink-low);
                }
                .sb-hud-phase {
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: ${BRAND};
                }
                .sb-hud-depth {
                    height: 4px;
                    margin: 0.55rem 0 0.5rem;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                }
                .sb-hud-depth-fill {
                    height: 100%;
                    background: var(--brand-gradient);
                    box-shadow: 0 0 10px var(--brand-glow);
                    transform-origin: left center;
                    transform: scaleX(0.04);
                    will-change: transform;
                }
                .sb-hud-meta {
                    font-size: 0.72rem;
                    color: var(--ink-mid);
                    font-variant-numeric: tabular-nums;
                }
                .sb-hud-score {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    font-size: 0.68rem;
                    font-weight: 800;
                    color: var(--ink-hi);
                    flex: none;
                }
                .sb-hud-ring {
                    position: absolute;
                    inset: 0;
                    transform: rotate(-90deg);
                }
                .sb-hud-ring-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.12);
                    stroke-width: 3;
                }
                .sb-hud-ring-fg {
                    fill: none;
                    stroke: ${BRAND};
                    stroke-width: 3;
                    stroke-linecap: round;
                    stroke-dasharray: 100;
                    transition: stroke-dashoffset 0.2s linear;
                }

                .sb-hint {
                    position: absolute;
                    top: 0.9rem;
                    right: 0.9rem;
                    padding: 0.35rem 0.6rem;
                    border-radius: 999px;
                    background: rgba(8, 8, 12, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--ink-mid);
                    font-size: 0.68rem;
                    letter-spacing: 0.06em;
                    opacity: 0;
                    transform: translateY(-6px);
                    transition: opacity 0.4s ease, transform 0.4s ease;
                    pointer-events: none;
                }
                .sb-hint.is-shown {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Beat rail down the right edge of the stage. */
                .sb-rail {
                    position: absolute;
                    right: -1.6rem;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    flex-direction: column;
                    gap: 0.7rem;
                    pointer-events: auto;
                }
                .sb-dot {
                    position: relative;
                    width: 0.7rem;
                    height: 0.7rem;
                    padding: 0;
                    border: 0;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.18);
                    cursor: pointer;
                    transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
                }
                .sb-dot:hover {
                    transform: scale(1.25);
                }
                .sb-dot.is-past {
                    background: rgba(255, 255, 255, 0.45);
                }
                .sb-dot.is-active {
                    background: ${BRAND};
                    box-shadow: 0 0 12px var(--brand-glow);
                    transform: scale(1.35);
                }
                .sb-dot-label {
                    position: absolute;
                    left: 1.2rem;
                    top: 50%;
                    transform: translateY(-50%) translateX(-4px);
                    white-space: nowrap;
                    font-size: 0.7rem;
                    color: var(--ink-mid);
                    background: rgba(8, 8, 12, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 999px;
                    padding: 0.2rem 0.55rem;
                    opacity: 0;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    pointer-events: none;
                }
                .sb-dot:hover .sb-dot-label,
                .sb-dot:focus-visible .sb-dot-label {
                    opacity: 1;
                    transform: translateY(-50%) translateX(0);
                }

                /* Desktop: captions overlay the bottom of the video card. */
                .sb-captions {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    min-height: 8rem;
                    padding: 0 1rem 2.4rem;
                    background: linear-gradient(to top, rgba(8, 8, 12, 0.88) 0%, rgba(8, 8, 12, 0.6) 55%, rgba(8, 8, 12, 0) 100%);
                    border-radius: 0 0 6px 6px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    pointer-events: none;
                }

                .sb-caption {
                    position: absolute;
                    left: 1rem;
                    right: 1rem;
                    bottom: 2.4rem;
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

                .sb-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    margin-top: 0.8rem;
                    padding: 0.55rem 1rem;
                    border-radius: 999px;
                    background: var(--brand-gradient);
                    color: #fff;
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-decoration: none;
                    box-shadow: 0 0 24px var(--brand-glow);
                    pointer-events: auto;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .sb-cta:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 0 34px var(--brand-glow);
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

                    .sb-rail {
                        right: -1.25rem;
                        top: 40%;
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
                    .sb-caption,
                    .shaipt-stage {
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
