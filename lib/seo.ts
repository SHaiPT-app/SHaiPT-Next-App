/**
 * One place for the facts every crawler-facing surface has to agree on.
 *
 * The apex (https://shaipt.com) 307s to www, so www is the canonical host: metadataBase, the
 * sitemap, robots and every JSON-LD `url` must use it, or Next builds absolute URLs that point at
 * a redirect.
 */
export const SITE_URL = 'https://www.shaipt.com';

export const SITE_NAME = 'SHaiPT';

/** Open Graph / Twitter card art. 1200x630 is the 1.91:1 slot both platforms crop to. */
export const OG_IMAGE = {
    width: 1200,
    height: 630,
    alt: 'SHaiPT — real-time 4D form check from one phone camera',
} as const;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}
