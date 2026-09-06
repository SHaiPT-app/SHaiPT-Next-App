'use client';

import Link from 'next/link';

/**
 * Editorial statement over a monochrome still from the reel: the one-line
 * proposition, a red rule, a footnote in mono, one action. Fashion-page
 * proportions: the type is the image.
 */
export default function Statement() {
    return (
        <section className="st" aria-label="One phone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/storyboard/1.png" alt="" className="st-img" decoding="async" loading="lazy" />
            <div className="st-veil" aria-hidden />
            <div className="st-corners" aria-hidden>
                <i /><i /><i /><i />
            </div>
            <div className="st-body">
                <div className="st-kicker">Statement — 02</div>
                <h2 className="st-title">
                    No wearable.
                    <br />
                    No fixed camera.
                    <br />
                    <em>One phone.</em>
                </h2>
                <div className="st-rule" />
                <p className="st-note">
                    Pose tracking, rep counting and the form check run in the browser, on the device. Nothing is uploaded to score a set.
                </p>
                <Link href="/login" className="st-btn">
                    Get started
                </Link>
            </div>

            <style jsx>{`
                .st {
                    position: relative;
                    z-index: 1;
                    min-height: 92vh;
                    display: grid;
                    align-items: end;
                    overflow: hidden;
                    color: #fff;
                    background: #050507;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                }
                .st-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 30%;
                    filter: grayscale(1) contrast(1.15) brightness(0.72);
                }
                .st-veil {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(5, 5, 7, 0.96) 0%, rgba(5, 5, 7, 0.55) 45%, rgba(5, 5, 7, 0.15) 100%);
                }
                .st-corners {
                    position: absolute;
                    inset: 2rem clamp(1.25rem, 4vw, 3rem);
                    pointer-events: none;
                }
                .st-corners i {
                    position: absolute;
                    width: 22px;
                    height: 22px;
                    border: 0 solid rgba(255, 255, 255, 0.6);
                }
                .st-corners i:nth-child(1) { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .st-corners i:nth-child(2) { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .st-corners i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .st-corners i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
                .st-body {
                    position: relative;
                    padding: 6rem clamp(1.25rem, 6vw, 5rem) 5rem;
                    max-width: 1400px;
                    width: 100%;
                    margin: 0 auto;
                }
                .st-kicker {
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--brand);
                    margin-bottom: 1.4rem;
                }
                .st-title {
                    margin: 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(3rem, 9vw, 8.5rem);
                    line-height: 0.94;
                    letter-spacing: -0.025em;
                }
                .st-title em {
                    font-style: italic;
                    color: var(--brand);
                }
                .st-rule {
                    width: min(22rem, 50%);
                    height: 2px;
                    background: var(--brand);
                    margin: 2rem 0 1.4rem;
                }
                .st-note {
                    margin: 0 0 2rem;
                    max-width: 50ch;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.06em;
                    line-height: 1.7;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.68);
                }
                :global(.st-btn) {
                    display: inline-block;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: #050507;
                    background: #fff;
                    padding: 0.95rem 1.6rem;
                    text-decoration: none;
                    transition: background 0.2s ease, color 0.2s ease;
                }
                :global(.st-btn):hover {
                    background: var(--brand);
                    color: #fff;
                }
            `}</style>
        </section>
    );
}
