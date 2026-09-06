'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useFourDcoachUrl } from '@/lib/fourDcoach';

/**
 * The layered reveal ("scrollcraft"): one pinned viewport, four layers moving at
 * their own pace with the scroll.
 *
 *  0. the scene — the bench press film under the title sequence keeps looping,
 *     monochrome and dark (the title sequence is rendered inside the pin as the
 *     hero state and fades out through the `--reveal` custom property);
 *  1. the veil — a same-colour fade that deepens as the phone takes the stage;
 *  2. the phone — starts below the fold with only its top edge showing, rises
 *     to the centre over the first ~90 vh of scroll and pins; its screen then
 *     crossfades through five 4Dcoach views, one per chapter;
 *  3. the type — one chapter beside the phone at a time (alternating sides on
 *     desktop, beneath it on mobile).
 *
 * Everything is driven by scroll progress in one requestAnimationFrame per
 * scroll event through refs; no React state in the scroll path. Scroll stops
 * ease the page onto a chapter's centre when scrolling settles inside it
 * (desktop), ← → jump between chapters, and a sideways drag over the phone
 * scrubs. Reduced motion: no pin, no scrub, no snapping; the tab row switches
 * the screen directly.
 */

type Chapter = {
    key: string;
    tab: string;
    src: string;
    n: string;
    title: string;
    em: string;
    body: string;
    readout: [string, string][];
};

const CHAPTERS: Chapter[] = [
    {
        key: 'setup',
        tab: 'Setup',
        src: '/screens/setup.png',
        n: '01',
        title: 'Film the set.',
        em: 'Name it, trim it.',
        body: 'Any phone, any angle, propped against a plate or a water bottle. At home or in the gym: pick the exercise, enter the load, cut the clip to the working set with two sliders. That is the whole setup.',
        readout: [['Camera', 'any phone'], ['Setup', '10 s'], ['Trim', 'two sliders']],
    },
    {
        key: 'processing',
        tab: 'Processing',
        src: '/screens/processing.png',
        n: '02',
        title: 'Tracked on the phone.',
        em: 'Step by step.',
        body: 'The lifter is found, the bar is found, every rep is counted and checked, all on the device. Nothing is uploaded unless you ask for the 3D body scan.',
        readout: [['Tracking', '10 fps'], ['Bar', 'auto'], ['Upload', 'none']],
    },
    {
        key: 'session',
        tab: 'Session',
        src: '/screens/session.png',
        n: '03',
        title: 'See it in 4D.',
        em: 'Then walk around it.',
        body: 'An avatar performs your set in 3D over time, with reps, tempo per rep, range of motion and load beside it. Orbit it, scrub it, slow it down.',
        readout: [['Replay', '3D · time'], ['Tempo', 'per rep'], ['ROM', 'cm']],
    },
    {
        key: 'formcheck',
        tab: 'Form check',
        src: '/screens/formcheck.png',
        n: '04',
        title: 'Every rep measured.',
        em: 'In plain words.',
        body: 'A technique score, a per-rep table of the angles that matter, and the rule that broke, named: the rep, the joint, the number, the fix.',
        readout: [['Score', '0–100'], ['Angles', 'per rep'], ['Warning', 'plain words']],
    },
    {
        key: 'ar',
        tab: 'AR',
        src: '/screens/ar.png',
        n: '05',
        title: 'Put it on your bench.',
        em: 'In your gym.',
        body: 'Place the avatar on the real bench with AR Quick Look on iPhone and compare it with your own set. Scan your body once and the avatar becomes you.',
        readout: [['AR', 'iPhone'], ['Body', 'yours'], ['Scale', '1 : 1']],
    },
];

/** Scroll budget in viewport heights: the rise, then one band per chapter. */
const RISE_VH = 90;
const CHAPTER_VH = 85;
const TRACK_VH = RISE_VH + CHAPTER_VH * CHAPTERS.length;
const P_RISE = RISE_VH / TRACK_VH;
const BAND = (1 - P_RISE) / CHAPTERS.length;
const BANDS = CHAPTERS.map((_, i) => {
    const start = P_RISE + i * BAND;
    const end = start + BAND;
    return { start, end, mid: (start + end) / 2 };
});
/** How much of the phone shows under the hero before the scroll starts, in viewport heights. */
const PEEK = 0.14;

export default function PhoneReveal({ hero }: { hero: ReactNode }) {
    const sectionRef = useRef<HTMLElement>(null);
    const dimRef = useRef<HTMLDivElement>(null);
    const phoneWrapRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);
    const screenRefs = useRef<(HTMLImageElement | null)[]>([]);
    const chapterRefs = useRef<(HTMLElement | null)[]>([]);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const indexRef = useRef<HTMLSpanElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const fourD = useFourDcoachUrl();

    useEffect(() => {
        const section = sectionRef.current;
        const phoneWrap = phoneWrapRef.current;
        const phone = phoneRef.current;
        if (!section || !phoneWrap || !phone) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pinned = () => window.matchMedia('(min-width: 901px)').matches;

        /** Paint one chapter as the active one: its screen, its type, its tab. */
        const applyBeat = (beat: number, p: number) => {
            const fade = BAND * 0.28;
            screenRefs.current.forEach((el, i) => {
                if (!el) return;
                const b = BANDS[i];
                const enter = i === 0 ? 1 : smooth((p - (b.start - fade / 2)) / fade);
                const leave = i === CHAPTERS.length - 1 ? 1 : 1 - smooth((p - (b.end - fade / 2)) / fade);
                el.style.opacity = String(enter * leave);
            });
            const margin = BAND * 0.09;
            const typeFade = BAND * 0.14;
            chapterRefs.current.forEach((el, i) => {
                if (!el) return;
                const b = BANDS[i];
                const o = segmentOpacity(p, b.start + margin, b.end - margin, typeFade);
                el.style.opacity = String(o);
                el.style.transform = `translate3d(0, ${((1 - o) * 16).toFixed(2)}px, 0)`;
                el.style.pointerEvents = o > 0.6 ? 'auto' : 'none';
                el.setAttribute('aria-hidden', String(o < 0.5));
            });
            tabRefs.current.forEach((el, i) => {
                if (!el) return;
                el.classList.toggle('is-active', i === beat);
                el.classList.toggle('is-past', i < beat);
                el.setAttribute('aria-selected', String(i === beat));
            });
            if (indexRef.current) indexRef.current.textContent = `${String(Math.max(0, beat + 1)).padStart(2, '0')} / ${String(CHAPTERS.length).padStart(2, '0')}`;
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, (p - P_RISE) / (1 - P_RISE))).toFixed(4)})`;
        };

        if (reduced) {
            // Final state, no scrub: the phone sits in place showing the session; the tabs switch screens directly.
            section.style.setProperty('--reveal', '1');
            section.dataset.hero = 'off';
            phoneWrap.style.transform = 'none';
            const show = (i: number) => applyBeat(i, BANDS[i].mid);
            show(2);
            const tabs = tabRefs.current.slice();
            const fns = tabs.map((el, i) => {
                const fn = () => show(i);
                el?.addEventListener('click', fn);
                return fn;
            });
            return () => tabs.forEach((el, i) => el?.removeEventListener('click', fns[i]));
        }

        let raf = 0;
        let progress = 0;
        let lastProgress = -1;
        let inView = false;
        let dragging = false;
        let settleTimer = 0;
        let programmaticUntil = 0;
        let riseDistance = 0;
        let heroOff = false;

        const track = () => {
            const rect = section.getBoundingClientRect();
            const vh = window.innerHeight;
            const total = Math.max(1, section.offsetHeight - vh);
            return { rect, vh, total, top: rect.top + window.scrollY };
        };
        const measure = () => {
            // The phone's resting place is its layout position; the rise starts with only PEEK of it above the fold.
            const vh = window.innerHeight;
            riseDistance = Math.max(0, vh - PEEK * vh - phoneWrap.offsetTop);
        };
        const scrollToProgress = (p: number, behavior: ScrollBehavior = 'smooth') => {
            const { top, total } = track();
            programmaticUntil = performance.now() + 900;
            window.scrollTo({ top: top + Math.max(0, Math.min(1, p)) * total, behavior });
        };

        const update = () => {
            const { rect, vh, total } = track();
            inView = rect.bottom > 0 && rect.top < vh;
            progress = Math.max(0, Math.min(1, -rect.top / total));
            if (Math.abs(progress - lastProgress) < 0.0004) return;
            lastProgress = progress;

            const rise = Math.max(0, Math.min(1, progress / P_RISE));
            const e = easeOutCubic(rise);
            section.style.setProperty('--reveal', rise.toFixed(3));
            const off = rise > 0.55;
            if (off !== heroOff) {
                heroOff = off;
                section.dataset.hero = off ? 'off' : 'on';
            }
            phoneWrap.style.transform = `translate3d(0, ${((1 - e) * riseDistance).toFixed(1)}px, 0) scale(${(0.94 + 0.06 * e).toFixed(3)})`;
            if (dimRef.current) dimRef.current.style.opacity = (0.38 * e).toFixed(3);

            const beat = progress < P_RISE ? -1 : Math.min(CHAPTERS.length - 1, Math.floor((progress - P_RISE) / BAND));
            applyBeat(beat, progress);
        };

        // Scroll stops: when the scroll settles inside a chapter, ease onto its centre.
        const settle = () => {
            if (!inView || dragging || !pinned() || performance.now() < programmaticUntil) return;
            if (progress >= 1) return;
            if (progress < P_RISE) {
                if (progress > P_RISE * 0.35) scrollToProgress(BANDS[0].mid);
                return;
            }
            const hold = BANDS.find((b) => progress >= b.start && progress < b.end);
            if (!hold || Math.abs(progress - hold.mid) < 0.004) return;
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
        const onResize = () => {
            measure();
            lastProgress = -1;
            onScroll();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        // Tabs and keyboard: jump between the chapters.
        const jump = (dir: 1 | -1) => {
            const i = BANDS.findIndex((b) => progress < b.mid - 0.004);
            const next = dir > 0 ? (i < 0 ? BANDS.length - 1 : i) : Math.max(0, (i < 0 ? BANDS.length : i) - 1);
            scrollToProgress(BANDS[next].mid);
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
        const tabs = tabRefs.current.slice();
        const tabClicks = tabs.map((el, i) => {
            const fn = () => scrollToProgress(BANDS[i].mid);
            el?.addEventListener('click', fn);
            return fn;
        });

        // Drag to scrub: a sideways drag over the phone moves the reel (and the page with it).
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
        };
        const onMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            if (!dragMoved) {
                if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.5) {
                    dragging = false; // a vertical gesture is a normal scroll
                    return;
                }
                if (Math.abs(dx) < 6) return;
                dragMoved = true;
                phone.setPointerCapture?.(e.pointerId);
                phone.classList.add('is-dragging');
            }
            const { total } = track();
            const width = phone.getBoundingClientRect().width || 1;
            programmaticUntil = performance.now() + 300;
            window.scrollTo({ top: dragStartScroll + (dx / width) * total * 0.35, behavior: 'auto' });
        };
        const endDrag = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            phone.classList.remove('is-dragging');
            if (phone.hasPointerCapture?.(e.pointerId)) phone.releasePointerCapture(e.pointerId);
            programmaticUntil = 0; // the drag's own guard must not block the stop after it
            window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(settle, 120);
        };
        phone.addEventListener('pointerdown', onDown);
        phone.addEventListener('pointermove', onMove);
        phone.addEventListener('pointerup', endDrag);
        phone.addEventListener('pointercancel', endDrag);

        measure();
        update();
        // Fonts and images settle the layout after the first paint; measure again once they have.
        const t = window.setTimeout(onResize, 400);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('keydown', onKey);
            tabs.forEach((el, i) => el?.removeEventListener('click', tabClicks[i]));
            phone.removeEventListener('pointerdown', onDown);
            phone.removeEventListener('pointermove', onMove);
            phone.removeEventListener('pointerup', endDrag);
            phone.removeEventListener('pointercancel', endDrag);
            window.clearTimeout(settleTimer);
            window.clearTimeout(t);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <section ref={sectionRef} id="chapters" className="pr" aria-label="How 4Dcoach works" data-hero="on">
            <div className="pr-pin">
                {/* Layer 0: the hero and its film. It stays as the scene; its type fades through --reveal. */}
                <div className="pr-hero">{hero}</div>
                {/* Layer 1: the veil. */}
                <div ref={dimRef} className="pr-dim" aria-hidden />

                <div className="pr-stage">
                    {/* Layer 3: the type, one chapter at a time. */}
                    <div className="pr-type">
                        {CHAPTERS.map((c, i) => (
                            <article
                                key={c.key}
                                ref={(el) => {
                                    chapterRefs.current[i] = el;
                                }}
                                className={`pr-ch pr-ch--${i % 2 ? 'right' : 'left'}`}
                                style={{ opacity: 0 }}
                                aria-hidden="true"
                            >
                                <div className="pr-ch-num">
                                    <span>{c.n}</span>
                                    <i />
                                    <span className="pr-ch-tab">{c.tab}</span>
                                </div>
                                <h2 className="pr-ch-title">
                                    {c.title} <em>{c.em}</em>
                                </h2>
                                <p className="pr-ch-body">{c.body}</p>
                                <dl className="pr-ch-readout">
                                    {c.readout.map(([k, v]) => (
                                        <div key={k}>
                                            <dt>{k}</dt>
                                            <dd>{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                                {i === CHAPTERS.length - 1 && (
                                    <div className="pr-ch-actions">
                                        <a href={fourD} className="pr-ch-link">
                                            Open 4Dcoach <span aria-hidden>→</span>
                                        </a>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>

                    {/* Layer 2: the phone. */}
                    <div ref={phoneWrapRef} className="pr-phone-wrap">
                        <div className="pr-frame" aria-hidden>
                            <i className="pr-corner pr-corner--tl" />
                            <i className="pr-corner pr-corner--tr" />
                            <i className="pr-corner pr-corner--bl" />
                            <i className="pr-corner pr-corner--br" />
                            <span className="pr-rec">
                                <i />
                                REC
                            </span>
                            <span ref={indexRef} className="pr-index">
                                00 / 05
                            </span>
                        </div>
                        <div ref={phoneRef} className="pr-phone" title="Drag sideways to scrub">
                            <div className="pr-screen">
                                <div className="pr-status" aria-hidden>
                                    <span>9:41</span>
                                    <span className="pr-status-r">
                                        <i className="pr-sig" />
                                        <i className="pr-bat" />
                                    </span>
                                </div>
                                {CHAPTERS.map((c, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={c.key}
                                        ref={(el) => {
                                            screenRefs.current[i] = el;
                                        }}
                                        src={c.src}
                                        alt={i === 0 ? '4Dcoach on a phone: setup, processing, the 4D session, the form check, AR' : ''}
                                        className="pr-shot"
                                        style={{ opacity: i === 0 ? 1 : 0 }}
                                        decoding="async"
                                        loading={i === 0 ? 'eager' : 'lazy'}
                                        draggable={false}
                                    />
                                ))}
                            </div>
                            <div className="pr-island" aria-hidden />
                        </div>
                    </div>

                    {/* The tab row: names the five screens, mirrors the active chapter, jumps on click. */}
                    <div className="pr-rail" role="tablist" aria-label="Chapters">
                        {CHAPTERS.map((c, i) => (
                            <button
                                key={c.key}
                                ref={(el) => {
                                    tabRefs.current[i] = el;
                                }}
                                type="button"
                                role="tab"
                                aria-selected={false}
                                className="pr-tab"
                            >
                                <span className="pr-tab-n">{c.n}</span>
                                <span className="pr-tab-l">{c.tab}</span>
                            </button>
                        ))}
                        <div className="pr-progress" aria-hidden>
                            <div ref={progressRef} className="pr-progress-fill" />
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .pr {
                    position: relative;
                    z-index: 1;
                    height: ${100 + TRACK_VH}vh;
                    background: #050507;
                    color: #fff;
                    --ph: min(72vh, 76svh);
                    --pw: calc(var(--ph) * 390 / 844);
                    --edge: clamp(1.25rem, 5vw, 4.5rem);
                }
                .pr-pin {
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    height: 100svh;
                    overflow: hidden;
                    background: #050507;
                }
                .pr-hero {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                }
                .pr-dim {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    background: rgba(5, 5, 7, 1);
                    opacity: 0;
                    pointer-events: none;
                }
                .pr-stage {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    pointer-events: none;
                }

                /* ── Layer 2: the phone ─────────────────────────────────── */
                .pr-phone-wrap {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: var(--pw);
                    height: var(--ph);
                    margin: calc(var(--ph) / -2) 0 0 calc(var(--pw) / -2);
                    will-change: transform;
                    pointer-events: auto;
                }
                .pr-phone {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding: calc(var(--pw) * 0.024);
                    border-radius: calc(var(--pw) * 0.135);
                    background: #000;
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62), 0 40px 120px rgba(0, 0, 0, 0.75);
                    cursor: grab;
                    touch-action: pan-y;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .pr-phone.is-dragging {
                    cursor: grabbing;
                    box-shadow: 0 0 0 1px var(--brand), 0 40px 120px rgba(0, 0, 0, 0.75);
                }
                .pr-screen {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: calc(var(--pw) * 0.112);
                    overflow: hidden;
                    background: #0a0a0c;
                }
                .pr-status {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5.9%;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 8% 0 9%;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-weight: 600;
                    font-size: calc(var(--pw) * 0.042);
                    color: #fff;
                    background: #0a0a0c;
                }
                .pr-status-r {
                    display: inline-flex;
                    align-items: center;
                    gap: calc(var(--pw) * 0.02);
                }
                .pr-sig {
                    width: calc(var(--pw) * 0.045);
                    height: calc(var(--pw) * 0.03);
                    background: linear-gradient(to right, #fff 0 22%, transparent 22% 30%, #fff 30% 52%, transparent 52% 60%, #fff 60% 82%, transparent 82%);
                    clip-path: polygon(0 60%, 100% 0, 100% 100%, 0 100%);
                }
                .pr-bat {
                    width: calc(var(--pw) * 0.066);
                    height: calc(var(--pw) * 0.032);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: calc(var(--pw) * 0.008);
                    background: linear-gradient(to right, #fff 0 78%, transparent 78%);
                    background-clip: content-box;
                    padding: 1px;
                }
                .pr-shot {
                    position: absolute;
                    top: 5.9%;
                    left: 0;
                    width: 100%;
                    height: 94.1%;
                    object-fit: cover;
                    object-position: top center;
                    will-change: opacity;
                    pointer-events: none;
                }
                .pr-island {
                    position: absolute;
                    top: calc(var(--pw) * 0.045);
                    left: 50%;
                    width: 31%;
                    height: calc(var(--pw) * 0.078);
                    border-radius: 999px;
                    background: #000;
                    transform: translateX(-50%);
                }

                /* HUD framing around the phone: corner brackets, REC, the chapter index. */
                .pr-frame {
                    position: absolute;
                    inset: -16px;
                    pointer-events: none;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.18em;
                    color: rgba(255, 255, 255, 0.72);
                    font-variant-numeric: tabular-nums;
                }
                .pr-corner {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border: 0 solid rgba(255, 255, 255, 0.8);
                }
                .pr-corner--tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .pr-corner--tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .pr-corner--bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .pr-corner--br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
                .pr-rec {
                    position: absolute;
                    left: 0;
                    bottom: -1.7rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    color: var(--brand);
                }
                .pr-rec i {
                    width: 7px;
                    height: 7px;
                    border-radius: 999px;
                    background: var(--brand);
                    animation: pr-blink 1.4s steps(1) infinite;
                }
                @keyframes pr-blink {
                    50% { opacity: 0.15; }
                }
                .pr-index {
                    position: absolute;
                    right: 0;
                    bottom: -1.7rem;
                }

                /* ── Layer 3: the type ──────────────────────────────────── */
                .pr-type {
                    position: absolute;
                    inset: 0;
                }
                .pr-ch {
                    position: absolute;
                    top: 50%;
                    width: min(28rem, calc(50vw - var(--pw) / 2 - var(--edge) - 3rem));
                    transform: translate3d(0, 16px, 0);
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                    will-change: opacity, transform;
                    pointer-events: none;
                }
                .pr-ch--left {
                    left: var(--edge);
                    translate: 0 -50%;
                }
                .pr-ch--right {
                    right: var(--edge);
                    translate: 0 -50%;
                }
                .pr-ch-num,
                .pr-ch-readout,
                .pr-ch-actions {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.68rem;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.55);
                }
                .pr-ch-num {
                    display: flex;
                    align-items: center;
                    gap: 0.9rem;
                    color: var(--brand);
                }
                .pr-ch-num i {
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.16);
                }
                .pr-ch-tab {
                    color: rgba(255, 255, 255, 0.5);
                }
                .pr-ch-title {
                    margin: 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(2.2rem, 3.9vw, 4rem);
                    line-height: 0.98;
                    letter-spacing: -0.02em;
                    color: #fff;
                }
                .pr-ch-title em {
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.5);
                }
                .pr-ch-body {
                    margin: 0;
                    max-width: 44ch;
                    font-size: 0.98rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.72);
                }
                .pr-ch-readout {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    margin: 0.2rem 0 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.14);
                }
                .pr-ch-readout div {
                    padding: 0.7rem 0.8rem 0.6rem 0;
                    border-right: 1px solid rgba(255, 255, 255, 0.08);
                }
                .pr-ch-readout div + div {
                    padding-left: 0.8rem;
                }
                .pr-ch-readout div:last-child {
                    border-right: 0;
                }
                .pr-ch-readout dt {
                    margin: 0 0 0.25rem;
                    font-size: 0.6rem;
                    color: rgba(255, 255, 255, 0.4);
                }
                .pr-ch-readout dd {
                    margin: 0;
                    font-size: 0.78rem;
                    letter-spacing: 0.1em;
                    color: #fff;
                    text-transform: none;
                }
                .pr-ch-actions {
                    margin-top: 0.2rem;
                    font-size: 0.76rem;
                    letter-spacing: 0.14em;
                }
                .pr-ch-link {
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    padding-bottom: 0.2rem;
                    transition: color 0.2s ease, border-color 0.2s ease;
                }
                .pr-ch-link:hover {
                    color: #fff;
                    border-color: var(--brand);
                }

                /* ── The tab row ────────────────────────────────────────── */
                .pr-rail {
                    position: absolute;
                    left: 50%;
                    bottom: max(1.3rem, env(safe-area-inset-bottom));
                    transform: translateX(-50%);
                    display: flex;
                    align-items: stretch;
                    gap: 0;
                    padding-bottom: 0.7rem;
                    pointer-events: auto;
                    /* hidden under the hero (its own HUD bar sits there), in once the phone has risen */
                    opacity: calc(var(--reveal, 0) * 1.4 - 0.4);
                }
                :global([data-hero='on']) .pr-rail {
                    pointer-events: none;
                }
                .pr-tab {
                    display: inline-flex;
                    align-items: baseline;
                    gap: 0.5rem;
                    padding: 0.55rem clamp(0.6rem, 1.4vw, 1.3rem);
                    border: 0;
                    background: none;
                    color: rgba(255, 255, 255, 0.45);
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: color 0.25s ease;
                }
                .pr-tab-n {
                    font-size: 0.58rem;
                    color: rgba(255, 255, 255, 0.3);
                    transition: color 0.25s ease;
                }
                .pr-tab:hover,
                .pr-tab.is-past {
                    color: rgba(255, 255, 255, 0.75);
                }
                .pr-tab.is-active {
                    color: #fff;
                }
                .pr-tab.is-active .pr-tab-n {
                    color: var(--brand);
                }
                .pr-tab:focus-visible {
                    outline: 1px solid var(--brand);
                    outline-offset: 2px;
                }
                .pr-progress {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.14);
                }
                .pr-progress-fill {
                    height: 100%;
                    background: var(--brand);
                    transform-origin: left center;
                    transform: scaleX(0);
                    will-change: transform;
                }

                /* ── Mobile: the phone pins high, the type stacks beneath it ── */
                @media (max-width: 900px) {
                    .pr {
                        --ph: min(50vh, 52svh);
                        --pw: calc(var(--ph) * 390 / 844);
                    }
                    .pr-phone-wrap {
                        top: 12vh;
                        top: 12svh;
                        margin-top: 0;
                    }
                    .pr-ch,
                    .pr-ch--left,
                    .pr-ch--right {
                        top: auto;
                        bottom: 4.6rem;
                        left: var(--edge);
                        right: var(--edge);
                        width: auto;
                        translate: 0 0;
                        gap: 0.7rem;
                    }
                    .pr-ch-title {
                        font-size: clamp(1.7rem, 7.5vw, 2.4rem);
                    }
                    .pr-ch-body {
                        font-size: 0.86rem;
                        line-height: 1.5;
                        max-width: none;
                    }
                    .pr-ch-readout {
                        display: none;
                    }
                    .pr-rail {
                        width: calc(100% - 2 * var(--edge));
                        justify-content: space-between;
                        bottom: max(0.8rem, env(safe-area-inset-bottom));
                        padding-bottom: 0.5rem;
                    }
                    .pr-tab {
                        padding: 0.4rem 0.2rem;
                        font-size: 0.56rem;
                        letter-spacing: 0.12em;
                        gap: 0.3rem;
                    }
                    .pr-tab-n {
                        display: none;
                    }
                    .pr-frame {
                        inset: -12px;
                    }
                    .pr-rec,
                    .pr-index {
                        bottom: -1.5rem;
                        font-size: 0.6rem;
                    }
                }
                @media (max-width: 900px) and (min-height: 760px) {
                    .pr-ch-readout {
                        display: grid;
                    }
                }

                /* ── Reduced motion: no pin, no scrub; hero then the phone in place ── */
                @media (prefers-reduced-motion: reduce) {
                    .pr {
                        height: auto;
                    }
                    .pr-pin {
                        position: relative;
                        height: auto;
                        overflow: visible;
                    }
                    .pr-hero {
                        position: relative;
                        height: 100svh;
                    }
                    .pr-dim {
                        display: none;
                    }
                    .pr-stage {
                        position: relative;
                        height: 100svh;
                    }
                    .pr-phone-wrap {
                        will-change: auto;
                    }
                    .pr-rec i {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    );
}

function smooth(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
}

function easeOutCubic(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - x, 3);
}

function segmentOpacity(progress: number, start: number, end: number, fade: number): number {
    if (progress < start - fade || progress > end + fade) return 0;
    if (progress < start) return smooth((progress - (start - fade)) / fade);
    if (progress > end) return smooth(1 - (progress - end) / fade);
    return 1;
}
