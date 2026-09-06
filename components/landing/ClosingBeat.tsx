'use client';

import Link from 'next/link';
import { useFourDcoachUrl } from '@/lib/fourDcoach';

/**
 * Closing beat: the opening scene again (the film, monochrome and dark), the
 * phone sitting low in the frame as it did under the hero, one headline and
 * the two links. The page ends the way it started.
 */
export default function ClosingBeat() {
    const fourD = useFourDcoachUrl();

    return (
        <section className="cb" aria-label="Get started">
            <video className="cb-film" src="/hero/bench.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden />
            <div className="cb-veil" aria-hidden />
            <div className="cb-corners" aria-hidden>
                <i /><i /><i /><i />
            </div>

            <div className="cb-body">
                <div className="cb-kicker">Closing — 03</div>
                <h2 className="cb-title">
                    Film a set.
                    <br />
                    <em>See it in 4D.</em>
                </h2>
                <p className="cb-note">Reps, tempo, a technique score in plain words and a replay you can walk around. From one phone, in about a minute.</p>
                <div className="cb-actions">
                    <Link href="/login" className="cb-btn">
                        Get started
                    </Link>
                    <a href={fourD} className="cb-link">
                        Open 4Dcoach <span aria-hidden>→</span>
                    </a>
                </div>
            </div>

            <div className="cb-phone-wrap" aria-hidden>
                <div className="cb-frame">
                    <i className="cb-c cb-c--tl" /><i className="cb-c cb-c--tr" /><i className="cb-c cb-c--bl" /><i className="cb-c cb-c--br" />
                    <span className="cb-rec"><i />REC</span>
                    <span className="cb-index">05 / 05</span>
                </div>
                <div className="cb-phone">
                    <div className="cb-screen">
                        <div className="cb-status">
                            <span>9:41</span>
                            <span className="cb-status-r"><i className="cb-sig" /><i className="cb-bat" /></span>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/screens/session.png" alt="" className="cb-shot" decoding="async" loading="lazy" draggable={false} />
                    </div>
                    <div className="cb-island" />
                </div>
            </div>

            <style jsx>{`
                .cb {
                    position: relative;
                    z-index: 1;
                    min-height: 100vh;
                    min-height: 100svh;
                    display: grid;
                    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
                    align-items: end;
                    overflow: hidden;
                    color: #fff;
                    background: #050507;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    --ph: min(78vh, 82svh);
                    --pw: calc(var(--ph) * 390 / 844);
                }
                .cb-film {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 40%;
                    filter: grayscale(1) contrast(1.12) brightness(0.42);
                    transform: scale(1.04);
                    pointer-events: none;
                }
                .cb-veil {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to right, rgba(5, 5, 7, 0.9) 0%, rgba(5, 5, 7, 0.6) 50%, rgba(5, 5, 7, 0.35) 100%), linear-gradient(to top, rgba(5, 5, 7, 0.9) 0%, rgba(5, 5, 7, 0) 45%);
                    pointer-events: none;
                }
                .cb-corners {
                    position: absolute;
                    inset: clamp(1.25rem, 4vw, 3rem);
                    pointer-events: none;
                }
                .cb-corners i {
                    position: absolute;
                    width: 22px;
                    height: 22px;
                    border: 0 solid rgba(255, 255, 255, 0.55);
                }
                .cb-corners i:nth-child(1) { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .cb-corners i:nth-child(2) { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .cb-corners i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .cb-corners i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }

                .cb-body {
                    position: relative;
                    z-index: 1;
                    padding: clamp(6rem, 16vh, 10rem) clamp(1.25rem, 5vw, 4.5rem) clamp(4rem, 12vh, 8rem);
                }
                .cb-kicker {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--brand);
                }
                .cb-title {
                    margin: 1rem 0 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(3rem, 8vw, 7.5rem);
                    line-height: 0.94;
                    letter-spacing: -0.02em;
                }
                .cb-title em {
                    font-style: italic;
                    color: var(--brand);
                }
                .cb-note {
                    max-width: 40ch;
                    margin: 1.8rem 0 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.8rem;
                    letter-spacing: 0.06em;
                    line-height: 1.7;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.7);
                }
                .cb-actions {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1.4rem;
                    margin-top: 2rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                }
                :global(.cb-btn) {
                    color: #fff;
                    background: var(--brand);
                    padding: 0.95rem 1.6rem;
                    text-decoration: none;
                    transition: background 0.2s ease, color 0.2s ease;
                }
                :global(.cb-btn):hover {
                    background: #fff;
                    color: #050507;
                }
                .cb-link {
                    color: rgba(255, 255, 255, 0.75);
                    text-decoration: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    padding-bottom: 0.2rem;
                    transition: color 0.2s ease, border-color 0.2s ease;
                }
                .cb-link:hover {
                    color: #fff;
                    border-color: var(--brand);
                }

                /* The phone sits low, partly below the fold, as it did under the hero. */
                .cb-phone-wrap {
                    position: relative;
                    z-index: 1;
                    justify-self: center;
                    width: var(--pw);
                    height: var(--ph);
                    transform: translateY(18%);
                }
                .cb-frame {
                    position: absolute;
                    inset: -16px;
                    pointer-events: none;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.18em;
                    color: rgba(255, 255, 255, 0.72);
                }
                .cb-c {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border: 0 solid rgba(255, 255, 255, 0.8);
                }
                .cb-c--tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .cb-c--tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .cb-c--bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .cb-c--br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
                .cb-rec {
                    position: absolute;
                    left: 0;
                    top: -1.7rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    color: var(--brand);
                }
                .cb-rec i {
                    width: 7px;
                    height: 7px;
                    border-radius: 999px;
                    background: var(--brand);
                    animation: cb-blink 1.4s steps(1) infinite;
                }
                @keyframes cb-blink {
                    50% { opacity: 0.15; }
                }
                .cb-index {
                    position: absolute;
                    right: 0;
                    top: -1.7rem;
                    font-variant-numeric: tabular-nums;
                }
                .cb-phone {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding: calc(var(--pw) * 0.024);
                    border-radius: calc(var(--pw) * 0.135);
                    background: #000;
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.62), 0 40px 120px rgba(0, 0, 0, 0.75);
                }
                .cb-screen {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: calc(var(--pw) * 0.112);
                    overflow: hidden;
                    background: #0a0a0c;
                }
                .cb-status {
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
                .cb-status-r {
                    display: inline-flex;
                    align-items: center;
                    gap: calc(var(--pw) * 0.02);
                }
                .cb-sig {
                    width: calc(var(--pw) * 0.045);
                    height: calc(var(--pw) * 0.03);
                    background: linear-gradient(to right, #fff 0 22%, transparent 22% 30%, #fff 30% 52%, transparent 52% 60%, #fff 60% 82%, transparent 82%);
                    clip-path: polygon(0 60%, 100% 0, 100% 100%, 0 100%);
                }
                .cb-bat {
                    width: calc(var(--pw) * 0.066);
                    height: calc(var(--pw) * 0.032);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: calc(var(--pw) * 0.008);
                    background: linear-gradient(to right, #fff 0 78%, transparent 78%);
                    background-clip: content-box;
                    padding: 1px;
                }
                .cb-shot {
                    position: absolute;
                    top: 5.9%;
                    left: 0;
                    width: 100%;
                    height: 94.1%;
                    object-fit: cover;
                    object-position: top center;
                }
                .cb-island {
                    position: absolute;
                    top: calc(var(--pw) * 0.045);
                    left: 50%;
                    width: 31%;
                    height: calc(var(--pw) * 0.078);
                    border-radius: 999px;
                    background: #000;
                    transform: translateX(-50%);
                }

                @media (max-width: 900px) {
                    .cb {
                        grid-template-columns: 1fr;
                        align-items: start;
                        --ph: min(60vh, 62svh);
                    }
                    .cb-body {
                        padding: clamp(5rem, 14vh, 8rem) clamp(1.25rem, 5vw, 4.5rem) 2rem;
                    }
                    .cb-phone-wrap {
                        transform: translateY(22%);
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .cb-rec i {
                        animation: none;
                    }
                }
            `}</style>
        </section>
    );
}
