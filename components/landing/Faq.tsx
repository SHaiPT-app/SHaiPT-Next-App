'use client';

import { FAQ_ITEMS } from '@/lib/landing/faq';

/**
 * FAQ as an editorial accordion: mono numbered questions, thin rules, native
 * <details> so it works without JavaScript. No cards.
 */

export default function Faq() {
    return (
        <section id="faq" className="fq" aria-label="Questions">
            <div className="fq-head">
                <div className="fq-kicker">Questions</div>
                <h2 className="fq-title">
                    Asked. <em>Answered.</em>
                </h2>
                <p className="fq-lede">What people want to know before the first set.</p>
            </div>
            <div className="fq-list">
                {FAQ_ITEMS.map((it, i) => (
                    <details key={it.q} className="fq-item">
                        <summary className="fq-q">
                            <span className="fq-n">{String(i + 1).padStart(2, '0')}</span>
                            <span className="fq-text">{it.q}</span>
                            <span className="fq-mark" aria-hidden />
                        </summary>
                        <p className="fq-a">{it.a}</p>
                    </details>
                ))}
            </div>

            <style jsx>{`
                .fq {
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
                .fq-head {
                    position: sticky;
                    top: 6rem;
                    align-self: start;
                }
                .fq-kicker {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--brand);
                }
                .fq-title {
                    margin: 0.9rem 0 1rem;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(2.6rem, 6vw, 5.6rem);
                    line-height: 0.96;
                    letter-spacing: -0.02em;
                }
                .fq-title em {
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.5);
                }
                .fq-lede {
                    margin: 0;
                    max-width: 34ch;
                    font-size: 1rem;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.65);
                }
                .fq-list {
                    border-top: 1px solid rgba(255, 255, 255, 0.14);
                }
                .fq-item {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
                }
                .fq-q {
                    display: grid;
                    grid-template-columns: 3rem minmax(0, 1fr) 1.5rem;
                    align-items: baseline;
                    gap: 0.5rem;
                    padding: 1.3rem 0;
                    list-style: none;
                    cursor: pointer;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.82rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.85);
                    transition: color 0.2s ease;
                }
                .fq-q::-webkit-details-marker {
                    display: none;
                }
                .fq-q:hover {
                    color: #fff;
                }
                .fq-n {
                    font-size: 0.66rem;
                    letter-spacing: 0.2em;
                    color: var(--brand);
                }
                .fq-mark {
                    position: relative;
                    width: 12px;
                    height: 12px;
                    justify-self: end;
                    align-self: center;
                }
                .fq-mark::before,
                .fq-mark::after {
                    content: '';
                    position: absolute;
                    background: rgba(255, 255, 255, 0.7);
                    transition: transform 0.25s ease;
                }
                .fq-mark::before {
                    left: 0;
                    top: 5.5px;
                    width: 12px;
                    height: 1px;
                }
                .fq-mark::after {
                    left: 5.5px;
                    top: 0;
                    width: 1px;
                    height: 12px;
                }
                .fq-item[open] .fq-mark::after {
                    transform: scaleY(0);
                }
                .fq-a {
                    margin: 0;
                    padding: 0 0 1.5rem 3.5rem;
                    max-width: 60ch;
                    font-size: 0.98rem;
                    line-height: 1.65;
                    color: rgba(255, 255, 255, 0.72);
                }
                @media (max-width: 900px) {
                    .fq {
                        grid-template-columns: 1fr;
                        gap: 2.5rem;
                    }
                    .fq-head {
                        position: static;
                    }
                    .fq-q {
                        grid-template-columns: 2.4rem minmax(0, 1fr) 1.2rem;
                    }
                    .fq-a {
                        padding-left: 2.9rem;
                    }
                }
            `}</style>
        </section>
    );
}
