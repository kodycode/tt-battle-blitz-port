// Boot the game headless, run a scripted list of inputs, log errors and the playhead, save screenshots.
// Usage: node scripts/smoke.mjs <outDir> <seconds> [action ...]
//   actions: "1.5:click:300,381"  "4:key:KeyZ" (tap)  "4:down:ArrowRight"  "6:up:ArrowRight"  "5:shot"
// Times are seconds after the start click. A screenshot is also taken every 2 s.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const outDir = process.argv[2] || 'smoke-out';
const seconds = Number(process.argv[3] || 20);
const actions = process.argv.slice(4).map((a) => {
  const [t, kind, arg] = a.split(':');
  return { t: Number(t) * 1000, kind, arg };
}).sort((a, b) => a.t - b.t);
fs.mkdirSync(outDir, { recursive: true });

const server = await createServer({ root, server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
// Chromium's software-WebGL notices (from the WebGL decode of 32-bit bitmaps without "use alpha") are benign.
const benign = (t) => /GroupMarkerNotSet|GL Driver Message|software WebGL/.test(t);
page.on('console', (m) => {
  if ((m.type() === 'error' || m.type() === 'warning') && !benign(m.text())) errors.push(`console.${m.type()}: ${m.text()}`);
});
const finish = async (code) => {
  console.log('errors:', errors.length);
  for (const e of errors.slice(0, 80)) console.log(e);
  await browser.close();
  await server.close();
  process.exit(code);
};
await page.goto('http://localhost:5199/' + (process.env.TT_QUERY || ''));
try {
  await page.waitForFunction(() => (window.__tt?.frames ?? 0) > 0, null, { timeout: 90000 });
} catch {
  console.log('boot did not finish; loading text =', await page.evaluate(() => document.getElementById('loading')?.textContent));
  await finish(1);
}
// Start click goes to a corner so it does not hit any button.
await page.mouse.click(2, 2);
const t0 = Date.now();
let shot = 0;
let nextShot = 2000;
const snap = async (tag) => {
  const info = await page.evaluate(() => ({ frames: window.__tt?.frames, frame: window.__tt?.player.frame() }));
  const file = path.join(outDir, `shot_${String(shot++).padStart(2, '0')}_f${info.frame}${tag ? '_' + tag : ''}.png`);
  await page.locator('#stage').screenshot({ path: file });
  console.log(JSON.stringify(info), path.basename(file));
};
while (Date.now() - t0 < seconds * 1000) {
  const now = Date.now() - t0;
  while (actions.length && actions[0].t <= now) {
    const a = actions.shift();
    if (a.kind === 'click') {
      const [x, y] = a.arg.split(',').map(Number);
      await page.mouse.move(x, y);
      await page.waitForTimeout(100);
      await page.mouse.click(x, y);
    } else if (a.kind === 'move') {
      const [x, y] = a.arg.split(',').map(Number);
      await page.mouse.move(x, y);
    } else if (a.kind === 'key') await page.keyboard.press(a.arg, { delay: 60 });
    else if (a.kind === 'down') await page.keyboard.down(a.arg);
    else if (a.kind === 'up') await page.keyboard.up(a.arg);
    else if (a.kind === 'shot') await snap('act');
    else if (a.kind === 'sprites') console.log(JSON.stringify(await page.evaluate(() => window.__tt.sprites()), null, 0));
    else if (a.kind === 'audiolog')
      await page.evaluate(() => {
        const am = window.__tt.g.main.audioMgr;
        const orig = am.playSound.bind(am);
        am.playSound = (mem, vol, pri) => {
          console.warn(`SOUND f=${window.__tt.player.frame()} ${mem && mem.name}`);
          return orig(mem, vol, pri);
        };
      });
    console.log(`t=${(now / 1000).toFixed(1)} ${a.kind} ${a.arg ?? ''}`);
  }
  if (now >= nextShot) {
    await snap('');
    nextShot += 2000;
  }
  if (errors.some((e) => !e.includes('SOUND'))) break;
  await page.waitForTimeout(50);
}
await finish(errors.length ? 1 : 0);
