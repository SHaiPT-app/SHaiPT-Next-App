'use client';

import Link from 'next/link';
import { useFourDcoachUrl } from '@/lib/fourDcoach';

/**
 * The right-hand column of the reel: five editorial chapters, one per storyboard
 * beat. Each is tall enough that the pinned stage on the left has room to play its
 * transition before the next stop. Numbers are set in mono like a HUD; headlines
 * in the editorial serif.
 */
const CHAPTERS: { n: string; title: string; em: string; body: string; readout: [string, string][] }[] = [
    {
        n: '01',
        title: 'Walk in with',
        em: 'the same doubt.',
        body: 'Was that deep enough? Were the elbows flared? A coach would know. A mirror pretends to. Your phone was in your pocket the whole time.',
        readout: [['Camera', 'any phone'], ['Angle', 'any'], ['Wearable', 'none']],
    },
    {
        n: '02',
        title: 'Prop the phone.',
        em: 'That is the setup.',
        body: 'No fixed camera, no rig, no wires. Lean it against a plate or a bottle. Handheld by a friend works too.',
        readout: [['Setup', '10 s'], ['Distance', '2–4 m'], ['Light', 'gym light']],
    },
    {
        n: '03',
        title: 'Hit record.',
        em: 'Then forget it.',
        body: 'SHaiPT tracks the lifter, not the room. The bar is found on its own. Bystanders are ignored. The set is trimmed with two sliders afterwards.',
        readout: [['Tracking', '10 fps'], ['Bar', 'auto'], ['Bystanders', 'ignored']],
    },
    {
        n: '04',
        title: 'Move.',
        em: 'Every rep is measured.',
        body: 'Reps, eccentric and concentric time, depth, bar path, reps in reserve from bar-speed loss, and a technique score with the rule it broke, in plain words.',
        readout: [['Reps', 'counted'], ['Tempo', 'per rep'], ['RIR', 'from velocity loss']],
    },
    {
        n: '05',
        title: 'See it in 4D.',
        em: 'Then walk around it.',
        body: 'An avatar of you performs the set in 3D over time. Orbit it, scrub it, slow it down, or place it on your real bench in AR. Scan your body once and the avatar becomes you.',
        readout: [['Replay', '3D over time'], ['AR', 'iPhone'], ['Body', 'yours']],
    },
];

export default function Chapters() {
    const fourD = useFourDcoachUrl();

    return (
        <div id="chapters" className="ch">
            <div className="ch-intro">
                <div className="ch-kicker">The reel — 01 / 05</div>
                <p className="ch-lede">
                    A set, filmed on a phone, becomes a measured replay. Scroll the reel, or drag the frame on the left.
                </p>
            </div>
            {CHAPTERS.map((c, i) => (
                <article key={c.n} className="ch-item" data-chapter={c.n}>
                    <div className="ch-num">
                        <span>{c.n}</span>
                        <i />
                    </div>
                    <h2 className="ch-title">
                        {c.title} <em>{c.em}</em>
                    </h2>
                    <p className="ch-body">{c.body}</p>
                    <dl className="ch-readout">
                        {c.readout.map(([k, v]) => (
                            <div key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                    {i === CHAPTERS.length - 1 && (
                        <div className="ch-actions">
                            <Link href="/login" className="ch-btn">
                                Get started
                            </Link>
                            <a href={fourD} className="ch-link">
                                Open 4Dcoach <span aria-hidden>→</span>
                            </a>
                        </div>
                    )}
                </article>
            ))}

            <style jsx>{`
                .ch {
                    padding: 14vh clamp(1.25rem, 5vw, 4.5rem) 12vh;
                    color: #fff;
                }
                .ch-intro {
                    min-height: 46vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    padding-bottom: 3rem;
                }
                .ch-kicker,
                .ch-num,
                .ch-readout,
                .ch-actions {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.55);
                }
                .ch-lede {
                    margin: 0;
                    max-width: 34ch;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-size: clamp(1.6rem, 2.6vw, 2.4rem);
                    line-height: 1.2;
                    color: rgba(255, 255, 255, 0.85);
                }
                .ch-item {
                    min-height: 74vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 1.3rem;
                    padding: 4rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                }
                .ch-num {
                    display: flex;
                    align-items: center;
                    gap: 0.9rem;
                    color: var(--brand);
                }
                .ch-num i {
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.14);
                }
                .ch-title {
                    margin: 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(2.4rem, 5vw, 4.8rem);
                    line-height: 0.98;
                    letter-spacing: -0.02em;
                    color: #fff;
                }
                .ch-title em {
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.5);
                }
                .ch-body {
                    margin: 0;
                    max-width: 48ch;
                    font-size: 1rem;
                    line-height: 1.65;
                    color: rgba(255, 255, 255, 0.72);
                }
                .ch-readout {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 0;
                    margin: 0.4rem 0 0;
                    border-top: 1px solid rgba(255, 255, 255, 0.14);
                    max-width: 40rem;
                }
                .ch-readout div {
                    padding: 0.8rem 0.9rem 0.8rem 0;
                    border-right: 1px solid rgba(255, 255, 255, 0.08);
                }
                .ch-readout div + div {
                    padding-left: 0.9rem;
                }
                .ch-readout div:last-child {
                    border-right: 0;
                }
                .ch-readout dt {
                    margin: 0 0 0.3rem;
                    font-size: 0.62rem;
                    color: rgba(255, 255, 255, 0.4);
                }
                .ch-readout dd {
                    margin: 0;
                    font-size: 0.8rem;
                    letter-spacing: 0.1em;
                    color: #fff;
                    text-transform: none;
                }
                .ch-actions {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1.4rem;
                    margin-top: 0.6rem;
                    font-size: 0.78rem;
                    letter-spacing: 0.14em;
                }
                :global(.ch-btn) {
                    color: #fff;
                    background: var(--brand);
                    padding: 0.95rem 1.6rem;
                    text-decoration: none;
                    transition: background 0.2s ease, color 0.2s ease;
                }
                :global(.ch-btn):hover {
                    background: #fff;
                    color: #050507;
                }
                .ch-link {
                    color: rgba(255, 255, 255, 0.75);
                    text-decoration: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    padding-bottom: 0.2rem;
                }
                .ch-link:hover {
                    color: #fff;
                    border-color: var(--brand);
                }
                @media (max-width: 900px) {
                    .ch {
                        padding-top: 2rem;
                    }
                    .ch-intro {
                        min-height: 0;
                        padding-bottom: 2rem;
                    }
                    .ch-item {
                        min-height: 0;
                        padding: 3rem 0;
                    }
                    .ch-readout {
                        grid-template-columns: 1fr;
                    }
                    .ch-readout div {
                        border-right: 0;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                        padding-left: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
