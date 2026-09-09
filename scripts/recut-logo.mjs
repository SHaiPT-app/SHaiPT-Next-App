/**
 * Re-cuts the logo PNGs onto the brand v2 palette: red #DA0023 on coal black #08080C.
 *
 * The v1 art was #FF002A on navy #15151F. Two separate problems came out of that:
 *
 *   1. The mark's red (#FF002A) was not the brand token (#DA0023) the whole UI uses, and the two
 *      sit next to each other in the landing nav — the logo, then the red "ai" in the wordmark.
 *   2. logo.png, circular_logo.png and logo_app_icon.png had the navy baked into their pixels, and
 *      circular_logo.png is the signed-in app's header logo, so the retired palette was live.
 *
 * logo_transparent.png is the master: everything else is rebuilt from it, so the four files cannot
 * drift apart again. Geometry is preserved exactly — measured from the originals rather than
 * guessed: a full square, a 500px circle, and that circle padded to 722.
 *
 * Run: node scripts/recut-logo.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const SRC_RED = [255, 0, 42];   // #FF002A, the v1 art
const DST_RED = [218, 0, 35];   // #DA0023, --brand
const COAL = '#08080C';         // --surface-0 / --background

/** Where the mark sits inside the derived files, measured from the v1 originals. */
const MARK_SCALE = 0.7224;
const MARK_OFFSET = [50.77, 69.54];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
await page.setContent('<body></body>');

const b64 = (name) => readFileSync(resolve(PUBLIC, name)).toString('base64');
const write = (name, dataUrl) =>
    writeFileSync(resolve(PUBLIC, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

// ── 1. Recolour the master's red, leaving white, black and alpha alone ────────────────────────
const recolour = async (name) => {
    const url = await page.evaluate(async ({ b64, srcRed, dstRed }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const image = ctx.getImageData(0, 0, img.width, img.height);
        const d = image.data;

        // The art is one flat red, antialiased toward white (the hand overlaps the top bar) and
        // toward transparency. Treat every pixel as a mix of white and the source red, recover the
        // mix from the green channel — white has g=255, the red has g=0 — and rebuild it with the
        // target red. Pure white maps to itself; the black nodes are not in the red family at all.
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) continue;
            const t = d[i + 1] / 255;
            const predR = t * 255 + (1 - t) * srcRed[0];
            const predB = t * 255 + (1 - t) * srcRed[2];
            if (Math.abs(d[i] - predR) > 12 || Math.abs(d[i + 2] - predB) > 20) continue;
            d[i] = Math.round(t * 255 + (1 - t) * dstRed[0]);
            d[i + 2] = Math.round(t * 255 + (1 - t) * dstRed[2]);
        }
        ctx.putImageData(image, 0, 0);
        return c.toDataURL('image/png');
    }, { b64: b64(name), srcRed: SRC_RED, dstRed: DST_RED });
    write(name, url);
    console.log(`recoloured ${name}`);
};

await recolour('logo_transparent.png');
await recolour('hero_logo_transparent.png');

// ── 2. Rebuild the three derived files from the recoloured master ─────────────────────────────
const build = async (name, { size, shape, pad = 0 }) => {
    const url = await page.evaluate(async (o) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + o.b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = o.size;
        c.height = o.size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = o.coal;
        if (o.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(o.size / 2, o.size / 2, (o.size - o.pad * 2) / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, o.size, o.size);
        }

        // Land the master's red bounding box exactly where the v1 files had it.
        const s = o.scale;
        ctx.drawImage(
            img,
            0, 0, img.width, img.height,
            o.pad + o.offset[0], o.pad + o.offset[1],
            img.width * s, img.height * s,
        );
        return c.toDataURL('image/png');
    }, {
        b64: b64('logo_transparent.png'),
        size, shape, pad, coal: COAL,
        scale: MARK_SCALE, offset: MARK_OFFSET,
    });
    write(name, url);
    console.log(`rebuilt ${name} (${size}x${size}, ${shape})`);
};

await build('logo.png', { size: 500, shape: 'square' });
await build('circular_logo.png', { size: 500, shape: 'circle' });
await build('logo_app_icon.png', { size: 722, shape: 'circle', pad: 111 });

await browser.close();
