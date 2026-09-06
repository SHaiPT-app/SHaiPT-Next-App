'use client';

/**
 * Spec sheet: what the camera measures, set as an editorial table. Thin rules,
 * mono labels, serif descriptions, tabular figures. No cards.
 */
const ROWS: { n: string; k: string; v: string; d: string }[] = [
    { n: '01', k: 'Reps', v: 'counted', d: 'From the lift itself, or from the bar when it is seen. Hysteresis, minimum phase 0.4 s, minimum rep 1.0 s.' },
    { n: '02', k: 'Tempo', v: 'per rep', d: 'Eccentric and concentric seconds for every rep, so a slow last rep is a number, not a feeling.' },
    { n: '03', k: 'Depth & angles', v: '30–80° · 85–95°', d: 'Elbow-to-torso at the bottom, the smallest elbow angle in the rep, trunk against shin, knee gap. Measured in 3D when the body is scanned.' },
    { n: '04', k: 'Bar path', v: 'cm', d: 'How far the bar wandered within a rep, from the lifter’s own scale. Shown for every rep, scored where the view allows.' },
    { n: '05', k: 'Reps in reserve', v: 'velocity loss', d: 'The same principle as bar-speed devices, read from video alone: how much the concentric slowed across the set.' },
    { n: '06', k: 'Technique score', v: '0–100', d: 'Exercise rules written in plain words. The warning names the rep, the joint, and the number that broke the range.' },
    { n: '07', k: '4D replay', v: '3D · time', d: 'An avatar, or your scanned body, performs the set. Orbit, scrub, slow down, place it on your real bench in AR.' },
];

export default function SpecSheet() {
    return (
        <section id="spec" className="sp" aria-label="What the camera measures">
            <div className="sp-head">
                <div className="sp-kicker">Spec sheet</div>
                <h2 className="sp-title">
                    Measured. <em>Not guessed.</em>
                </h2>
                <p className="sp-lede">Seven readings from one clip. No wearable, no fixed camera, no subscription hardware.</p>
            </div>
            <div className="sp-table" role="table">
                {ROWS.map((r) => (
                    <div key={r.n} className="sp-row" role="row">
                        <span className="sp-n">{r.n}</span>
                        <span className="sp-k">{r.k}</span>
                        <span className="sp-v">{r.v}</span>
                        <span className="sp-d">{r.d}</span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .sp {
                    position: relative;
                    z-index: 1;
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
                    gap: clamp(2rem, 6vw, 6rem);
                    padding: clamp(5rem, 12vh, 9rem) clamp(1.25rem, 5vw, 4.5rem);
                    color: #fff;
                    background: rgba(5, 5, 7, 0.82);
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                }
                .sp-head {
                    position: sticky;
                    top: 6rem;
                    align-self: start;
                }
                .sp-kicker {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--brand);
                    margin-bottom: 1.2rem;
                }
                .sp-title {
                    margin: 0 0 1.2rem;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(2.6rem, 6vw, 5.6rem);
                    line-height: 0.96;
                    letter-spacing: -0.02em;
                }
                .sp-title em {
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.5);
                }
                .sp-lede {
                    margin: 0;
                    max-width: 36ch;
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.6;
                }
                .sp-table {
                    border-top: 1px solid rgba(255, 255, 255, 0.2);
                }
                .sp-row {
                    display: grid;
                    grid-template-columns: 2.6rem 9rem 8rem minmax(0, 1fr);
                    gap: 1rem;
                    align-items: baseline;
                    padding: 1.35rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    transition: background 0.2s ease;
                }
                .sp-row:hover {
                    background: rgba(255, 255, 255, 0.025);
                }
                .sp-n,
                .sp-v {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.72rem;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    font-variant-numeric: tabular-nums;
                }
                .sp-n {
                    color: var(--brand);
                }
                .sp-v {
                    color: rgba(255, 255, 255, 0.55);
                }
                .sp-k {
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-size: 1.5rem;
                    line-height: 1.1;
                }
                .sp-d {
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.6;
                    font-size: 0.95rem;
                }
                @media (max-width: 900px) {
                    .sp {
                        grid-template-columns: 1fr;
                    }
                    .sp-head {
                        position: static;
                    }
                    .sp-row {
                        grid-template-columns: 2.2rem minmax(0, 1fr);
                        grid-template-areas: 'n k' 'n v' 'n d';
                        gap: 0.35rem 1rem;
                    }
                    .sp-n { grid-area: n; }
                    .sp-k { grid-area: k; }
                    .sp-v { grid-area: v; }
                    .sp-d { grid-area: d; margin-top: 0.3rem; }
                }
            `}</style>
        </section>
    );
}
