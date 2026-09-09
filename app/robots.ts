import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt.
 *
 * Everything in PROTECTED_PREFIXES (see proxy.ts) redirects a signed-out visitor to /login, so a
 * crawler that follows those links only ever burns budget on a redirect. Disallow them outright.
 * /demo is deliberately *not* disallowed: those pages carry `noindex` in their metadata, and a
 * crawler has to be allowed to fetch a page to see that it says noindex.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/home',
                '/ai',
                '/plans',
                '/workouts',
                '/workout',
                '/nutrition',
                '/body',
                '/activity',
                '/dms',
                '/profile',
                '/trainer',
                '/coach',
                '/dashboard',
                '/settings',
                '/onboarding',
                '/feed',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
