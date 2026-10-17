// Headless test of the bring-your-own-data flow (docs/EXTRACTION.md) in a fresh browser profile, ignoring
// public/data (?nostatic=1): first-run screen -> a wrong file is rejected -> the real zip through the file
// input -> verified, extracted in the worker, stored in IndexedDB -> the game boots to the title screen.
// Then a reload must boot straight from IndexedDB, and ?reset=1 must bring the first-run screen back.
// Usage: node scripts/firstrun_test.mjs [path/to/ttbattleblitz.zip] [--out <screenshotDir>]
//   zip default: local/original/ttbattleblitz.zip
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? path.resolve(args.splice(outIdx, 2)[1]) : null;
const zip = path.resolve(args[0] || path.join(root, 'local', 'original', 'ttbattleblitz.zip'));
if (!fs.existsSync(zip)) {
  console.error(`no zip at ${zip}`);
  process.exit(2);
}
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const server = await createServer({
  root,
  server: { port: 5297, strictPort: false, hmr: false, watch: { ignored: ['**/*'] } },
  logLevel: 'error',
});
await server.listen();
const base = server.resolvedUrls?.local?.[0] || `http://localhost:${server.config.server.port}/`;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 600, height: 400 } });
const page = await context.newPage();
const errors = [];
const benign = (t) => /GroupMarkerNotSet|GL Driver Message|software WebGL|willReadFrequently/.test(t);
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('console', (m) => {
  if ((m.type() === 'error' || m.type() === 'warning') && !benign(m.text())) errors.push(`console.${m.type()}: ${m.text()}`);
});
let failed = false;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed = true;
};
const shot = async (name) => outDir && page.screenshot({ path: path.join(outDir, name + '.png') });
const url = (q) => new URL(q, base).href;
const firstRunShown = () => page.locator('#firstrun').count().then((n) => n > 0);
const waitClickToStart = (timeout) =>
  page.waitForFunction(() => (window.__tt?.frames ?? 0) > 0, null, { timeout });
const toTitle = async () => {
  await page.mouse.click(2, 2);
  await page.waitForFunction(() => window.__tt?.frames > 20 && window.__tt.g?.main?.currScreenID === window.__tt.g.SCREEN_TITLE, null, {
    timeout: 30000,
  });
};

try {
  // 1. Fresh profile, static data ignored: first-run screen.
  await page.goto(url('?nostatic=1'));
  await page.waitForSelector('#firstrun', { timeout: 30000 });
  check(await firstRunShown(), 'first-run screen on an empty profile');
  check((await page.locator('#firstrun a[href="https://archive.org/details/ttbattleblitz"]').count()) > 0, 'links the Internet Archive page');
  await shot('1_firstrun');

  // 2. A wrong file is rejected with a clear error.
  const bogus = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ttbb-')), 'not-the-game.zip');
  fs.writeFileSync(bogus, 'PK\u0003\u0004 definitely not the game');
  await page.setInputFiles('#firstrun input[type=file]', bogus);
  await page.waitForFunction(() => document.querySelector('#firstrun .error')?.textContent?.includes('SHA-1'), null, { timeout: 10000 });
  check(true, `wrong file rejected: "${await page.locator('#firstrun .error').textContent()}"`);
  await shot('2_wrong_file');

  // 3. The real zip: verify, extract (progress), store, boot.
  const t0 = Date.now();
  await page.setInputFiles('#firstrun input[type=file]', zip);
  await page.waitForFunction(() => document.querySelector('#firstrun .status')?.textContent, null, { timeout: 10000 });
  await shot('3_progress');
  console.log('     progress:', await page.locator('#firstrun .status').textContent());
  await waitClickToStart(300000);
  check(!(await firstRunShown()), `extracted and booted from the zip (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  await toTitle();
  check(true, 'reached the title screen');
  await page.waitForTimeout(500);
  await shot('4_title_from_zip');

  // 4. Reload: boots from IndexedDB, no first-run screen; the remove-data link is offered.
  const t1 = Date.now();
  await page.goto(url('?nostatic=1'));
  await waitClickToStart(120000);
  check(!(await firstRunShown()), `reload booted from IndexedDB (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
  check((await page.getByText('Remove stored game data').count()) > 0, 'remove-data link offered');
  await toTitle();
  check(true, 'reached the title screen from IndexedDB');
  await page.waitForTimeout(500);
  await shot('5_title_from_idb');

  // 5. ?reset=1 removes the stored data: first-run screen again.
  await page.goto(url('?nostatic=1&reset=1'));
  await page.waitForSelector('#firstrun', { timeout: 30000 });
  check(await firstRunShown(), '?reset=1 removed the stored data');
  check(!(await page.locator('#firstrun .remove').isVisible()), 'nothing left to remove');
} catch (e) {
  check(false, 'flow error: ' + (e.message || e).split('\n')[0]);
  await shot('error').catch(() => {});
  console.log('loading =', await page.evaluate(() => document.getElementById('loading')?.textContent).catch(() => null));
  console.log('first-run error =', await page.evaluate(() => document.querySelector('#firstrun .error')?.textContent ?? null).catch(() => null));
}
const real = errors.filter((e) => !e.includes('could not be stored'));
check(real.length === 0, `no page errors (${real.length})`);
for (const e of real.slice(0, 20)) console.log('  ' + e);
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
