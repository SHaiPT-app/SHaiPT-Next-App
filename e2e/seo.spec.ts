import { test, expect } from '@playwright/test';

/**
 * The crawler-facing surface, checked against a real server rather than against the metadata
 * objects — robots.txt and sitemap.xml are route handlers, canonical and JSON-LD are only correct
 * once Next has resolved them, and every one of these was silently absent in production before.
 *
 * Runs against `pnpm dev` (reuseExistingServer) or the deployed site with PLAYWRIGHT_BASE_URL.
 */

test('robots.txt is served, allows the site and points at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');

    const body = await res.text();
    expect(body).toContain('User-Agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://www.shaipt.com/sitemap.xml');

    // The app's own screens redirect signed-out crawlers to /login; do not spend budget there.
    for (const path of ['/api/', '/home', '/settings', '/onboarding']) {
        expect(body, `robots.txt should disallow ${path}`).toContain(`Disallow: ${path}`);
    }
    // /demo must stay crawlable, or its noindex can never be read.
    expect(body).not.toContain('Disallow: /demo');
});

test('sitemap.xml is served as XML and lists only indexable pages on www', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const body = await res.text();
    expect(body).toContain('<loc>https://www.shaipt.com/</loc>');
    expect(body).toContain('<loc>https://www.shaipt.com/login</loc>');
    expect(body).not.toContain('/demo');
    expect(body).not.toContain('https://shaipt.com/'); // the apex redirects; never link it
});

test('the landing page has exactly one h1 and a self-referencing canonical', async ({ page }) => {
    await page.goto('/');

    const headings = page.locator('h1');
    await expect(headings).toHaveCount(1);
    // The three animated lines still have to read as one sentence.
    await expect(headings.first()).toHaveText(/Real-time\s+smart 4D\s+form check\./);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', 'https://www.shaipt.com');
});

test('/login carries its own canonical, not the landing page one', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://www.shaipt.com/login',
    );
});

test('the OG card is the 1200x630 image, not the square logo', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'https://www.shaipt.com/og.png',
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        'content',
        'https://www.shaipt.com/og.png',
    );

    const image = await request.get('/og.png');
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
});

test('the demo walkthrough is noindex and the public pages are not', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    for (const path of ['/', '/login']) {
        await page.goto(path);
        await expect(page.locator('meta[name="robots"]'), `${path} must stay indexable`)
            .toHaveAttribute('content', /^index/);
    }
});

test('structured data parses and describes what is on the page', async ({ page }) => {
    await page.goto('/');

    const blocks: unknown[] = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')));

    const byType = new Map(blocks.map((b) => [(b as { '@type': string })['@type'], b]));
    expect([...byType.keys()].sort()).toEqual(['FAQPage', 'Organization', 'SoftwareApplication']);

    const app = byType.get('SoftwareApplication') as {
        name: string;
        applicationCategory: string;
        url: string;
        offers: { name: string; price: string; priceCurrency: string }[];
    };
    expect(app.name).toBe('SHaiPT');
    expect(app.applicationCategory).toBe('HealthApplication');
    expect(app.url).toBe('https://www.shaipt.com/');
    expect(app.offers).toHaveLength(3);

    // What the page actually says, scripts stripped. textContent rather than innerText on purpose:
    // the FAQ answers live inside collapsed <details>, so they are absent from innerText but present
    // in the HTML — and the HTML is the standard the markup has to match.
    await expect(page.locator('#pricing')).toBeAttached();
    await expect(page.locator('#faq')).toBeAttached();
    const visible = await page.evaluate(() => {
        const body = document.body.cloneNode(true) as HTMLElement;
        body.querySelectorAll('script, style').forEach((n) => n.remove());
        return body.textContent ?? '';
    });
    for (const offer of app.offers) {
        expect(offer.priceCurrency).toBe('USD');
        expect(visible, `price ${offer.price} should be on the page`).toContain(`$${offer.price}`);
    }

    // Same for every marked-up FAQ: answering a question in JSON-LD that is not on the page is a
    // structured-data violation, so this is the check that matters most.
    const faq = byType.get('FAQPage') as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(6);
    for (const question of faq.mainEntity) {
        expect(visible, `question "${question.name}" should be on the page`).toContain(question.name);
        expect(
            visible,
            `answer to "${question.name}" should be on the page`,
        ).toContain(question.acceptedAnswer.text.slice(0, 60));
    }
});
