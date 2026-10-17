// Port runner for the verification scenarios (docs/VERIFICATION.md): boots the port headless in deterministic
// test mode (?test=1), plays a scenario tick by tick and writes {frames/NNNNNN.png, frames.json}.
// Usage: node scripts/run_port.mjs verification/scenarios/<name>.json [--out <dir>] [--batch N] [--rgba]
//   --out    capture directory (default: local/captures/<scenario>/port)
//   --batch  ticks per browser round trip (default 15)
//   --rgba   keep the canvas's RGBA PNGs instead of re-encoding to RGB (faster)
//   --sprites also write sprites.json: window.__tt.sprites() after the last tick of every batch
//            (use with --batch 1 for a per-tick dump of members, rects, inks, locZ)
//   --rng-trace record the caller stack of every random() call per tick (frames.json rngCalls)
//   --mem    run the in-memory (extracted-data) path on the static files (?mem=1); must match the default exactly
//   --zip <ttbattleblitz.zip>  ignore public/data and boot from the zip through the first-run screen
//            (fresh browser profile: verify, extract in the worker, IndexedDB, boot)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const outOpt = opt('--out', null);
const batch = Math.max(1, Number(opt('--batch', 15)) || 15);
const keepRgba = flag('--rgba');
const dumpSprites = flag('--sprites');
const rngTraceOpt = flag('--rng-trace'); // frames.json gets rngCalls (caller stack per random() call) per tick
const memOpt = flag('--mem');
const zipOpt = opt('--zip', null);
const spriteDump = {};
const scriptPath = args[0];
if (!scriptPath) {
  console.error('usage: node scripts/run_port.mjs <script.json> [--out dir] [--batch N] [--rgba]');
  process.exit(2);
}
const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
const scenario = script.name || path.basename(scriptPath, '.json');
const ticks = Number(script.ticks);
const seed = Number(script.seed ?? 0);
let outDir = path.resolve(outOpt || path.join(root, 'local', 'captures', scenario, 'port'));
// Never delete anything: frames are overwritten in place. If the folder already holds more frames than this
// run will write (stale extras would confuse the diff), write to <outDir>_2, _3, … instead.
const frameCount = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).length : 0);
{
  const base = outDir;
  for (let n = 2; frameCount(path.join(outDir, 'frames')) > ticks; n++) outDir = `${base}_${n}`;
  if (outDir !== base) console.log(`note: ${base} has more frames than ${ticks}; writing to ${outDir}`);
}
const framesDir = path.join(outDir, 'frames');
fs.mkdirSync(framesDir, { recursive: true });

// Events grouped by tick, array order preserved.
const byTick = new Map();
for (const e of script.events || []) {
  if (!(e.tick >= 1 && e.tick <= ticks)) {
    console.warn('ignoring event outside 1..ticks:', JSON.stringify(e));
    continue;
  }
  if (!byTick.has(e.tick)) byTick.set(e.tick, []);
  const { tick, ...ev } = e;
  byTick.get(e.tick).push(ev);
}

const t0 = Date.now();
// No HMR / file watching: source edits by other processes during a run must not reload the page mid-capture.
const server = await createServer({
  root,
  server: { port: 5299, strictPort: false, hmr: false, watch: { ignored: ['**/*'] } },
  logLevel: 'error',
});
await server.listen();
const base = server.resolvedUrls?.local?.[0] || `http://localhost:${server.config.server.port}/`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`);
});
const finish = async (code) => {
  if (errors.length) {
    console.log(`page errors: ${errors.length}`);
    for (const e of errors.slice(0, 40)) console.log('  ' + e);
  }
  await browser.close();
  await server.close();
  process.exit(code);
};

const query = ['test=1', rngTraceOpt && 'rngtrace=1', memOpt && 'mem=1', zipOpt && 'nostatic=1'].filter(Boolean).join('&');
await page.goto(new URL('?' + query, base).href);
if (zipOpt) {
  await page.waitForSelector('#firstrun input[type=file]', { state: 'attached', timeout: 60000 });
  await page.setInputFiles('#firstrun input[type=file]', path.resolve(zipOpt));
}
try {
  await page.waitForFunction(() => window.__tt?.test?.ready === true, null, { timeout: 180000 });
} catch {
  console.error(
    'port did not reach test mode; loading text =',
    await page.evaluate(() => document.getElementById('loading')?.textContent),
    '; first-run error =',
    await page.evaluate(() => document.querySelector('#firstrun .error')?.textContent ?? null),
  );
  await finish(1);
}
const tBoot = Date.now();
await page.evaluate((s) => window.__tt.test.init(s), seed);

const records = [];
const writes = [];
const savePng = (tick, dataUrl) => {
  let buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  if (!keepRgba) {
    const png = PNG.sync.read(buf);
    buf = PNG.sync.write(png, { colorType: 2, inputColorType: 6, inputHasAlpha: true });
  }
  writes.push(fs.promises.writeFile(path.join(framesDir, String(tick).padStart(6, '0') + '.png'), buf));
};
const runBatch = (from, to) => {
  const evs = [];
  for (let t = from; t <= to; t++) evs.push(byTick.get(t) || []);
  return page.evaluate((e) => window.__tt.test.run(e, true), evs);
};

// Pipeline: the browser runs the next batch while Node encodes and writes the previous one.
let next = 1;
let pending = null;
const launch = () => {
  if (next > ticks) return null;
  const from = next;
  const to = Math.min(ticks, from + batch - 1);
  next = to + 1;
  return runBatch(from, to);
};
pending = launch();
let lastLog = Date.now();
while (pending) {
  let results;
  try {
    results = await pending;
  } catch (e) {
    errors.push('evaluate failed: ' + (e.message || e));
    break;
  }
  if (dumpSprites && results.length) spriteDump[results[results.length - 1].state.tick] = await page.evaluate(() => window.__tt.sprites());
  pending = launch();
  for (const r of results) {
    records.push(r.state);
    savePng(r.state.tick, r.png);
  }
  if (Date.now() - lastLog > 5000) {
    lastLog = Date.now();
    const s = records[records.length - 1];
    console.log(`tick ${s.tick}/${ticks} frame ${s.frame} screen ${s.screen}`);
  }
}
await Promise.all(writes);

const out = { side: 'port', scenario, seed, ticks: records };
fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify(out, null, 0).replace(/\},\{"tick"/g, '},\n{"tick"'));
if (dumpSprites) fs.writeFileSync(path.join(outDir, 'sprites.json'), JSON.stringify(spriteDump).replace(/\],"/g, '],\n"'));
const last = records[records.length - 1];
console.log(
  `${scenario}: ${records.length}/${ticks} ticks -> ${outDir} (boot ${((tBoot - t0) / 1000).toFixed(1)} s, run ${((Date.now() - tBoot) / 1000).toFixed(1)} s); last frame ${last?.frame}, screen ${last?.screen}`,
);
await finish(records.length === ticks && !errors.some((e) => e.startsWith('pageerror') || e.startsWith('evaluate')) ? 0 : 1);
