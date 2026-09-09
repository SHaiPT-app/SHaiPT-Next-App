/**
 * Guards on the crawler-facing surface.
 *
 * These assert the things that were silently wrong before and would be silently wrong again:
 * absolute URLs pointing at the redirecting apex, an OG card at the wrong aspect ratio, robots
 * rules that stop disallowing a route someone adds to proxy.ts, and structured data that drifts
 * away from the content it claims to describe.
 */
import { metadata } from '@/app/layout';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { SITE_URL, OG_IMAGE, absoluteUrl } from '@/lib/seo';
import { FAQ_ITEMS } from '@/lib/landing/faq';
import { PRICING_TIERS } from '@/lib/landing/pricing';

describe('site URL', () => {
    it('is the www host, because the apex 307s to it', () => {
        expect(SITE_URL).toBe('https://www.shaipt.com');
    });

    it('never builds a URL on the redirecting apex', () => {
        expect(absoluteUrl('/login')).toBe('https://www.shaipt.com/login');
    });
});

describe('root metadata', () => {
    it('anchors metadataBase on the canonical host', () => {
        expect(metadata.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    });

    it('emits a canonical that resolves against the current route, not the landing page', () => {
        // "/" here would make every page declare itself a duplicate of "/".
        expect(metadata.alternates?.canonical).toBe('./');
    });

    it('is indexable', () => {
        expect(metadata.robots).toMatchObject({ index: true, follow: true });
    });

    it('ships a 1.91:1 OG card, not the old 512x512 logo', () => {
        const images = metadata.openGraph?.images as Array<{ url: string; width: number; height: number }>;
        expect(images).toHaveLength(1);
        expect(images[0].url).toBe('/og.png');
        expect(images[0].width).toBe(1200);
        expect(images[0].height).toBe(630);
        // 1200x630 is 1.9048:1 — the exact pixel size Facebook, X and LinkedIn all crop to,
        // conventionally written 1.91:1.
        expect(OG_IMAGE.width / OG_IMAGE.height).toBeCloseTo(1.91, 1);
    });

    it('points the Twitter card at the same image it declares a large summary for', () => {
        expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
        expect(metadata.twitter?.images).toEqual(['/og.png']);
    });
});

describe('robots.txt', () => {
    const r = robots();
    const rules = r.rules as { allow: string; disallow: string[] };

    it('points at the sitemap on the canonical host', () => {
        expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    });

    it('allows the public site', () => {
        expect(rules.allow).toBe('/');
    });

    it.each([
        '/home', '/plans', '/workout', '/nutrition', '/body', '/activity', '/dms',
        '/profile', '/trainer', '/coach', '/dashboard', '/settings', '/onboarding', '/feed',
    ])('disallows %s, which redirects signed-out visitors to /login', (path) => {
        expect(rules.disallow).toContain(path);
    });

    it('disallows the API', () => {
        expect(rules.disallow).toContain('/api/');
    });

    it('leaves /demo crawlable so its noindex can be read', () => {
        expect(rules.disallow).not.toContain('/demo');
        expect(rules.disallow).not.toContain('/demo/');
    });

    it('never disallows the landing page or /login', () => {
        expect(rules.disallow).not.toContain('/');
        expect(rules.disallow).not.toContain('/login');
    });
});

describe('sitemap.xml', () => {
    const entries = sitemap();

    it('lists the landing page and /login, absolute and on www', () => {
        expect(entries.map((e) => e.url)).toEqual([
            `${SITE_URL}/`,
            `${SITE_URL}/login`,
        ]);
    });

    it('lists nothing that robots.txt disallows or that carries noindex', () => {
        const disallowed = (robots().rules as { disallow: string[] }).disallow;
        for (const entry of entries) {
            const path = new URL(entry.url).pathname;
            expect(disallowed.some((d) => path.startsWith(d))).toBe(false);
            expect(path.startsWith('/demo')).toBe(false);
        }
    });
});

describe('structured data sources', () => {
    it('has FAQ content to mark up', () => {
        expect(FAQ_ITEMS.length).toBeGreaterThan(0);
        for (const item of FAQ_ITEMS) {
            expect(item.q.trim()).not.toBe('');
            expect(item.a.trim()).not.toBe('');
        }
    });

    it('exposes prices the Offer markup can parse as a number', () => {
        expect(PRICING_TIERS).toHaveLength(3);
        for (const tier of PRICING_TIERS) {
            expect(tier.price).toMatch(/^\$\d+(\.\d{2})?$/);
            expect(Number(tier.price.replace('$', ''))).toBeGreaterThan(0);
        }
    });
});
