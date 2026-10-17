// Real-time performance check in normal mode (not ?test=1): boots the dev server, opens the page with
// ?perf=1 (main.ts records per-tick logic/render times in window.__tt.perf), clicks through the menus into a
// fight (Robin, Easy) and plays a few actions, then reports the achieved game fps and per-frame render cost.
// Usage: node scripts/perf.mjs [fightSeconds=20] [--cpu-throttle N] [--gpu]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const throttleIdx = args.indexOf('--cpu-throttle');
const throttle = throttleIdx >= 0 ? Number(args.splice(throttleIdx, 2)[1]) : 1;
const gpuIdx = args.indexOf('--gpu');
const gpu = gpuIdx >= 0 && !!args.splice(gpuIdx, 1);
const fightSeconds = Number(args[0] || 20);

const server = await createServer({ root, server: { port: 5198, strictPort: true }, logLevel: 'error' });
await server.listen();
// --gpu: hardware-accelerated canvas (ANGLE/D3D11), where getImageData readbacks are expensive.
const browser = await chromium.launch(gpu ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] } : {});
const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
if (throttle > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
await page.goto('http://localhost:5198/?perf=1');
await page.waitForFunction(() => document.getElementById('loading')?.textContent?.includes('Click'), null, { timeout: 120000 });
await page.mouse.click(2, 2);

const frames = () => page.evaluate(() => window.__tt.frames);
const waitFrames = async (n) => {
  while ((await frames()) < n) await page.waitForTimeout(20);
};
// Menu clicks at the fighter scenarios' ticks (Start, NEXT, Easy, Robin, Fight).
const clicks = [
  [30, 300, 381],
  [130, 300, 383],
  [230, 124, 355],
  [290, 108, 302],
  [350, 302, 129],
];
for (const [t, x, y] of clicks) {
  await waitFrames(t);
  await page.mouse.move(x, y);
  await waitFrames(t + 2);
  await page.mouse.down();
  await waitFrames(t + 4);
  await page.mouse.up();
}
await waitFrames(640); // fight is playable from ~612
const f0 = await frames();
const p0 = await page.evaluate(() => window.__tt.perf.render.length);
const tStart = Date.now();
// Some actions so effects, shadows and hit sparks are on screen.
const keys = ['ArrowRight', 'KeyZ', 'KeyX', 'ArrowUp', 'KeyZ', 'ArrowLeft', 'KeyX', 'ArrowDown', 'KeyZ'];
let k = 0;
while (Date.now() - tStart < fightSeconds * 1000) {
  const key = keys[k++ % keys.length];
  await page.keyboard.down(key);
  await page.waitForTimeout(key.startsWith('Arrow') ? 400 : 80);
  await page.keyboard.up(key);
  await page.waitForTimeout(250);
}
const secs = (Date.now() - tStart) / 1000;
const f1 = await frames();
const perf = await page.evaluate((p0) => {
  const p = window.__tt.perf;
  return { render: p.render.slice(p0), logic: p.logic.slice(p0) };
}, p0);
const stats = (a) => {
  const s = a.slice().sort((x, y) => x - y);
  const q = (f) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  return { mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +s[s.length - 1].toFixed(2) };
};
console.log(JSON.stringify({
  cpuThrottle: throttle,
  gpu,
  fightSeconds: +secs.toFixed(1),
  gameFps: +((f1 - f0) / secs).toFixed(2),
  frame: await page.evaluate(() => window.__tt.player.frame()),
  renderMs: stats(perf.render),
  logicMs: stats(perf.logic),
  errors: errors.length,
}, null, 1));
for (const e of errors.slice(0, 10)) console.log(e);
await browser.close();
await server.close();
process.exit(0);
