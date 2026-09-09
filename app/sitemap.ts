import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * sitemap.xml — only pages that are public, indexable and worth a crawl.
 *
 * The app's own screens are behind proxy.ts, and /demo carries noindex, so neither belongs here.
 * `lastModified` is build time: this is a static marketing surface, so a redeploy is genuinely the
 * last time any of it changed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return [
        {
            url: `${SITE_URL}/`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${SITE_URL}/login`,
            lastModified,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];
}
