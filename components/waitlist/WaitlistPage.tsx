'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The waitlist landing page — the destination for paid traffic.
 *
 * Deliberately not the full landing page: an ad click gets one promise, one field and no way out
 * except the form. There is no nav, no pricing and no second call to action, because every link
 * off this page is a click Ali paid for and lost.
 *
 * The page carries the brand's language (the film, the corner brackets, the mono caps, the
 * editorial serif) so it does not read as a different company than the one in the ad.
 */

type Status = 'idle' | 'sending' | 'done' | 'error';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** Where the first-touch campaign is remembered between visits. */
const FIRST_TOUCH_KEY = 'shaipt.waitlist.firstTouch';

/** The three facts on the page that are checkable, taken from what the app actually ships. */
const SPECS = [
    { k: 'Input', v: 'One phone camera' },
    { k: 'Library', v: '876 exercises' },
    { k: 'Hardware', v: 'No wearables' },
];

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState(''); // honeypot
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');
    const [already, setAlready] = useState(false);

    /* Captured once on mount: by the time someone submits, a client-side navigation may have
       rewritten the query string, and the campaign that paid for the click would be lost. */
    const attribution = useRef<{ utm: Record<string, string>; referrer: string; landingPath: string }>({
        utm: {},
        referrer: '',
        landingPath: '',
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const utm: Record<string, string> = {};
        for (const key of UTM_KEYS) {
            const value = params.get(key);
            if (value) utm[key] = value;
        }
        // Google Ads sends gclid, Meta sends fbclid; keep whichever arrived as the source of record
        // when the campaign forgot its utm tags.
        if (!utm.utm_source) {
            if (params.get('gclid')) utm.utm_source = 'google';
            else if (params.get('fbclid')) utm.utm_source = 'meta';
        }

        /* First touch wins. Plenty of people click the ad, leave, and come back later by typing the
           address — without this, that signup records as organic and the campaign that actually paid
           for it looks worse than it was. Storage can throw (private windows, blocked site data), so
           every read and write is guarded and the page works identically with none of it. */
        let resolved = { utm, referrer: document.referrer, landingPath: window.location.pathname };
        try {
            const stored = window.localStorage.getItem(FIRST_TOUCH_KEY);
            if (Object.keys(utm).length > 0) {
                // This visit carries a campaign. It is the first touch only if nothing is stored yet.
                if (stored) resolved = JSON.parse(stored);
                else window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(resolved));
            } else if (stored) {
                // An untagged visit: credit whatever brought them the first time.
                resolved = JSON.parse(stored);
            }
        } catch {
            // No storage — fall back to this visit's own parameters.
        }
        attribution.current = resolved;
    }, []);

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (status === 'sending') return;
        setStatus('sending');
        setMessage('');

        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, company, ...attribution.current }),
            });
            const data = await response.json();

            if (!response.ok) {
                setStatus('error');
                setMessage(data?.error ?? 'Something went wrong. Try again.');
                return;
            }

            const isDuplicate = Boolean(data.already);
            setAlready(isDuplicate);
            setStatus('done');

            /* Conversion signal. Both Google Ads and Meta can be pointed at a dataLayer event
               instead of a hardcoded pixel id, which keeps the ad account's plumbing out of the
               repo — see growth/ads/tracking.md for what goes in the tag manager.

               Only a genuinely new row counts. Someone who submits twice sees a friendly "already
               on the list", but firing the event again would report a conversion the database never
               gained — and cost-per-signup is the number the ad budget gets steered by. */
            if (!isDuplicate) {
                type DataLayerWindow = Window & { dataLayer?: unknown[] };
                const w = window as DataLayerWindow;
                w.dataLayer = w.dataLayer ?? [];
                w.dataLayer.push({ event: 'waitlist_signup', utm_campaign: attribution.current.utm.utm_campaign ?? null });
            }
        } catch {
            setStatus('error');
            setMessage('Network trouble. Try again in a moment.');
        }
    }

    return (
        <main className="wl">
            <video className="wl-film" src="/hero/bench.mp4" autoPlay muted loop playsInline preload="metadata" aria-hidden />
            <div className="wl-veil" aria-hidden />
            <div className="wl-corners" aria-hidden>
                <i /><i /><i /><i />
            </div>

            <div className="wl-body">
                <div className="wl-kicker">
                    <span className="wl-rec" aria-hidden><i />REC</span>
                    SHaiPT — Early access
                </div>

                <h1 className="wl-title">
                    Your lift, scored by
                    <br />
                    <em>your phone camera.</em>
                </h1>

                <p className="wl-note">
                    Film one set. SHaiPT gives back a 4D replay you can walk around — reps, tempo and a
                    technique score in plain words. No wearables. No gym sensors. No trainer.
                </p>

                {status === 'done' ? (
                    <div className="wl-done" role="status">
                        <div className="wl-done-mark" aria-hidden>✓</div>
                        <p className="wl-done-title">
                            {already ? "You're already on the list." : "You're on the list."}
                        </p>
                        <p className="wl-done-note">
                            We&apos;ll email <strong>{email}</strong> when your place opens. Nothing else — no
                            newsletter, no digest.
                        </p>
                    </div>
                ) : (
                    <form className="wl-form" onSubmit={onSubmit} noValidate>
                        <label className="wl-label" htmlFor="wl-email">
                            Email
                        </label>
                        <div className="wl-row">
                            <input
                                id="wl-email"
                                className="wl-input"
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                required
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-describedby="wl-fine"
                                aria-invalid={status === 'error'}
                            />
                            <button className="wl-btn" type="submit" disabled={status === 'sending'}>
                                {status === 'sending' ? 'Sending…' : 'Request access'}
                            </button>
                        </div>

                        {/* Honeypot. Off-screen rather than display:none — some bots skip hidden fields. */}
                        <div className="wl-hp" aria-hidden>
                            <label htmlFor="wl-company">Company</label>
                            <input
                                id="wl-company"
                                name="company"
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                            />
                        </div>

                        {status === 'error' && (
                            <p className="wl-err" role="alert">
                                {message}
                            </p>
                        )}

                        <p className="wl-fine" id="wl-fine">
                            Invite-only while we scale. One email when your place opens — that&apos;s the
                            whole deal.
                        </p>
                    </form>
                )}

                <dl className="wl-specs">
                    {SPECS.map((spec) => (
                        <div key={spec.k}>
                            <dt>{spec.k}</dt>
                            <dd>{spec.v}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <div className="wl-phone-wrap" aria-hidden>
                <div className="wl-frame">
                    <i className="wl-c wl-c--tl" /><i className="wl-c wl-c--tr" /><i className="wl-c wl-c--bl" /><i className="wl-c wl-c--br" />
                    <span className="wl-index">FORM CHECK</span>
                </div>
                <div className="wl-phone">
                    <div className="wl-screen">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/screens/formcheck.png" alt="" className="wl-shot" decoding="async" draggable={false} />
                    </div>
                    <div className="wl-island" />
                </div>
            </div>

            <style jsx>{`
                .wl {
                    position: relative;
                    min-height: 100vh;
                    min-height: 100svh;
                    display: grid;
                    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
                    align-items: center;
                    overflow: hidden;
                    color: #fff;
                    background: #050507;
                    --ph: min(74vh, 78svh);
                    --pw: calc(var(--ph) * 390 / 844);
                }
                .wl-film {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 40%;
                    filter: grayscale(1) contrast(1.12) brightness(0.34);
                    transform: scale(1.04);
                    pointer-events: none;
                }
                .wl-veil {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to right, rgba(5, 5, 7, 0.94) 0%, rgba(5, 5, 7, 0.68) 55%, rgba(5, 5, 7, 0.4) 100%),
                        linear-gradient(to top, rgba(5, 5, 7, 0.9) 0%, rgba(5, 5, 7, 0) 50%);
                    pointer-events: none;
                }
                .wl-corners {
                    position: absolute;
                    inset: clamp(1.25rem, 4vw, 3rem);
                    pointer-events: none;
                }
                .wl-corners i {
                    position: absolute;
                    width: 22px;
                    height: 22px;
                    border: 0 solid rgba(255, 255, 255, 0.5);
                }
                .wl-corners i:nth-child(1) { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .wl-corners i:nth-child(2) { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .wl-corners i:nth-child(3) { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .wl-corners i:nth-child(4) { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }

                .wl-body {
                    position: relative;
                    z-index: 1;
                    padding: clamp(4rem, 10vh, 7rem) clamp(1.25rem, 5vw, 4.5rem);
                }
                .wl-kicker {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.7rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.6);
                }
                .wl-rec {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    color: var(--brand);
                }
                .wl-rec i {
                    width: 7px;
                    height: 7px;
                    border-radius: 999px;
                    background: var(--brand);
                    animation: wl-blink 1.4s steps(1) infinite;
                }
                @keyframes wl-blink {
                    50% { opacity: 0.15; }
                }
                .wl-title {
                    margin: 1.1rem 0 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-weight: 400;
                    font-size: clamp(2.6rem, 6.4vw, 5.8rem);
                    line-height: 0.96;
                    letter-spacing: -0.02em;
                }
                .wl-title em {
                    font-style: italic;
                    color: var(--brand);
                }
                .wl-note {
                    max-width: 46ch;
                    margin: 1.6rem 0 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.05em;
                    line-height: 1.75;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.66);
                }

                .wl-form {
                    margin-top: 2.4rem;
                    max-width: 34rem;
                }
                .wl-label {
                    display: block;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.66rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.45);
                    margin-bottom: 0.6rem;
                }
                .wl-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.6rem;
                }
                .wl-input {
                    flex: 1 1 16rem;
                    min-width: 0;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    color: #fff;
                    padding: 0.95rem 1.1rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.85rem;
                    letter-spacing: 0.04em;
                    border-radius: 0;
                    transition: border-color 0.2s ease, background 0.2s ease;
                }
                .wl-input::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                .wl-input:focus {
                    outline: none;
                    border-color: var(--brand);
                    background: rgba(255, 255, 255, 0.07);
                }
                .wl-input[aria-invalid='true'] {
                    border-color: var(--brand-hot);
                }
                .wl-btn {
                    flex: 0 0 auto;
                    background: var(--brand);
                    color: #fff;
                    border: 1px solid var(--brand);
                    padding: 0.95rem 1.8rem;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.78rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s ease, color 0.2s ease;
                }
                .wl-btn:hover:not(:disabled) {
                    background: #fff;
                    border-color: #fff;
                    color: #050507;
                }
                .wl-btn:disabled {
                    opacity: 0.55;
                    cursor: default;
                }
                .wl-hp {
                    position: absolute;
                    left: -9999px;
                    width: 1px;
                    height: 1px;
                    overflow: hidden;
                }
                .wl-err {
                    margin: 0.9rem 0 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.72rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--brand-hot);
                }
                .wl-fine {
                    margin: 1.1rem 0 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.68rem;
                    letter-spacing: 0.08em;
                    line-height: 1.7;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.4);
                }

                .wl-done {
                    margin-top: 2.4rem;
                    max-width: 34rem;
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-left: 2px solid var(--brand);
                    padding: 1.6rem 1.5rem;
                    background: rgba(255, 255, 255, 0.03);
                }
                .wl-done-mark {
                    font-size: 1.1rem;
                    color: var(--brand);
                    line-height: 1;
                }
                .wl-done-title {
                    margin: 0.8rem 0 0;
                    font-family: var(--font-editorial), 'Times New Roman', serif;
                    font-size: clamp(1.6rem, 3vw, 2.2rem);
                    line-height: 1.1;
                }
                .wl-done-note {
                    margin: 0.8rem 0 0;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.72rem;
                    letter-spacing: 0.06em;
                    line-height: 1.8;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.6);
                }
                .wl-done-note strong {
                    color: #fff;
                    font-weight: 400;
                }

                .wl-specs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2.4rem;
                    margin: 3rem 0 0;
                    padding-top: 1.6rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                }
                .wl-specs dt {
                    font-size: 0.62rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.38);
                }
                .wl-specs dd {
                    margin: 0.4rem 0 0;
                    font-size: 0.82rem;
                    letter-spacing: 0.06em;
                    color: rgba(255, 255, 255, 0.85);
                }

                .wl-phone-wrap {
                    position: relative;
                    z-index: 1;
                    justify-self: center;
                    width: var(--pw);
                    height: var(--ph);
                }
                .wl-frame {
                    position: absolute;
                    inset: -16px;
                    pointer-events: none;
                    font-family: var(--font-geist-mono), ui-monospace, monospace;
                    font-size: 0.62rem;
                    letter-spacing: 0.2em;
                    color: rgba(255, 255, 255, 0.6);
                }
                .wl-c {
                    position: absolute;
                    width: 18px;
                    height: 18px;
                    border: 0 solid rgba(255, 255, 255, 0.75);
                }
                .wl-c--tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
                .wl-c--tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
                .wl-c--bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
                .wl-c--br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
                .wl-index {
                    position: absolute;
                    right: 0;
                    top: -1.7rem;
                }
                .wl-phone {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    padding: calc(var(--pw) * 0.024);
                    border-radius: calc(var(--pw) * 0.135);
                    background: #000;
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55), 0 40px 120px rgba(0, 0, 0, 0.8);
                }
                .wl-screen {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: calc(var(--pw) * 0.112);
                    overflow: hidden;
                    background: #0a0a0c;
                }
                .wl-shot {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: top center;
                }
                .wl-island {
                    position: absolute;
                    top: calc(var(--pw) * 0.045);
                    left: 50%;
                    width: 31%;
                    height: calc(var(--pw) * 0.078);
                    border-radius: 999px;
                    background: #000;
                    transform: translateX(-50%);
                }

                /* Single column below 980px. The order matters more than it looks: this page is
                   paid traffic's first and only screen, and most of that traffic is on a phone, so
                   the promise and the field go above the fold and the device mockup follows them.
                   Leading with the mockup pushed the email input off the first screen entirely. */
                @media (max-width: 980px) {
                    .wl {
                        grid-template-columns: 1fr;
                        align-items: start;
                        --ph: min(52vh, 54svh);
                    }
                    .wl-body {
                        order: 1;
                        padding: clamp(2.5rem, 7vh, 4rem) clamp(1.25rem, 5vw, 3rem) 1.5rem;
                    }
                    .wl-title {
                        font-size: clamp(2.4rem, 11vw, 3.4rem);
                    }
                    .wl-note {
                        margin-top: 1.2rem;
                        font-size: 0.72rem;
                        line-height: 1.65;
                    }
                    .wl-form {
                        margin-top: 1.8rem;
                    }
                    /* Full-width button under the field: a half-width target beside a shrunken
                       input is the classic mobile form mistake. */
                    .wl-input,
                    .wl-btn {
                        flex: 1 1 100%;
                    }
                    .wl-phone-wrap {
                        order: 2;
                        margin: clamp(2.5rem, 7vh, 4rem) 0 clamp(3rem, 8vh, 4rem);
                    }
                    .wl-specs {
                        gap: 1.6rem 2rem;
                        margin-top: 2.2rem;
                    }
                }
                @media (prefers-reduced-motion: reduce) {
                    .wl-rec i {
                        animation: none;
                    }
                    .wl-film {
                        display: none;
                    }
                }
            `}</style>
        </main>
    );
}
