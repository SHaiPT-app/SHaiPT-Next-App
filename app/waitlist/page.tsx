import type { Metadata } from 'next';
import { absoluteUrl, OG_IMAGE, SITE_NAME } from '@/lib/seo';
import WaitlistPage from '@/components/waitlist/WaitlistPage';

/**
 * /waitlist — the landing page paid traffic points at.
 *
 * Indexable on purpose: its copy is aimed at the long-tail terms SHaiPT can actually win
 * ("AI form check", "phone camera squat form analysis"), which is the same tail the SEO work
 * picked. It carries its own canonical so the ad platforms' ?utm_* and ?gclid variants all
 * consolidate onto one URL instead of splitting into duplicates.
 */
export const metadata: Metadata = {
    title: 'Early access — AI form check from one phone camera',
    description:
        'Film one set and get a 4D replay you can walk around: reps, tempo and a technique score in plain words. No wearables, no gym sensors. Join the SHaiPT waitlist.',
    alternates: { canonical: absoluteUrl('/waitlist') },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        url: absoluteUrl('/waitlist'),
        title: 'SHaiPT early access — your lift, scored by your phone camera',
        description:
            'Film one set and get a 4D replay you can walk around: reps, tempo and a technique score in plain words.',
        images: [{ url: absoluteUrl('/og.png'), ...OG_IMAGE }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SHaiPT early access — your lift, scored by your phone camera',
        description: 'Film one set. Get reps, tempo and a technique score. No wearables.',
        images: [absoluteUrl('/og.png')],
    },
};

export default function Waitlist() {
    return <WaitlistPage />;
}
