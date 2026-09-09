/**
 * Renders public/og.png — the 1200x630 card Google, Slack, X, iMessage and LinkedIn show when
 * someone pastes a shaipt.com link.
 *
 * The old card was logo_transparent.png: a 512x512 square declared as summary_large_image, so every
 * platform letterboxed or cropped it. This draws the landing page's own language instead (black,
 * Instrument Serif, one red rule, mono HUD) at the exact aspect ratio the slot wants.
 *
 * Run: node scripts/generate-og.mjs
 * Deliberately reproducible and version-controlled, so the card can be re-cut when the copy changes
 * rather than being an unexplained binary in public/.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og.png');

const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: #050507; color: #fff;
    font-family: 'Geist Mono', ui-monospace, monospace;
    display: grid; grid-template-rows: auto 1fr auto;
    position: relative; overflow: hidden;
  }
  .grain {
    position: absolute; inset: -50%;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
    opacity: 0.07; mix-blend-mode: overlay;
  }
  .corners i { position: absolute; width: 26px; height: 26px; border: 0 solid rgba(255,255,255,0.5); }
  .corners i:nth-child(1) { top: 40px; left: 48px; border-top-width: 1px; border-left-width: 1px; }
  .corners i:nth-child(2) { top: 40px; right: 48px; border-top-width: 1px; border-right-width: 1px; }
  .corners i:nth-child(3) { bottom: 40px; left: 48px; border-bottom-width: 1px; border-left-width: 1px; }
  .corners i:nth-child(4) { bottom: 40px; right: 48px; border-bottom-width: 1px; border-right-width: 1px; }

  header, footer { display: flex; justify-content: space-between; align-items: center;
    padding: 44px 72px; font-size: 15px; letter-spacing: 0.22em; text-transform: uppercase;
    color: rgba(255,255,255,0.6); position: relative; z-index: 2; }
  .brand { font-family: 'Instrument Serif', serif; font-size: 30px; letter-spacing: 0.02em;
    text-transform: none; color: #fff; }
  .brand em { font-style: normal; color: #da0023; }
  main { padding: 0 72px; align-self: center; position: relative; z-index: 2; }
  h1 { font-family: 'Instrument Serif', serif; font-weight: 400; font-size: 92px;
    line-height: 0.98; letter-spacing: -0.02em; }
  h1 .em { font-style: italic; color: #da0023; }
  .rule { width: 340px; height: 3px; background: #da0023; margin: 34px 0 26px; }
  .sub { font-size: 17px; letter-spacing: 0.08em; line-height: 1.7; text-transform: uppercase;
    color: rgba(255,255,255,0.72); max-width: 46ch; }
  .rec { display: inline-flex; align-items: center; gap: 10px; color: #da0023; }
  .dot { width: 10px; height: 10px; border-radius: 999px; background: #da0023; }
</style>
</head>
<body>
  <div class="grain"></div>
  <div class="corners"><i></i><i></i><i></i><i></i></div>
  <header>
    <span class="brand">SH<em>ai</em>PT</span>
    <span>Your AI personal trainer</span>
  </header>
  <main>
    <h1>Real-time <span class="em">smart 4D</span><br>form check.</h1>
    <div class="rule"></div>
    <p class="sub">One phone. No wearable. Every rep measured, replayed in 3D, scored.</p>
  </main>
  <footer>
    <span class="rec"><span class="dot"></span>REC 00:00:04:12</span>
    <span>Pose lock 98.4%</span>
    <span>shaipt.com</span>
  </footer>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: 'networkidle' });
// Webfonts land after networkidle on a slow link; wait for the real thing before shooting.
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`wrote ${OUT}`);
