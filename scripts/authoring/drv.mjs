// closed-loop scenario-design driver (scenario authoring helper; not part of the game)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // project root (scripts/authoring/ -> ../..)
const scriptsDir = path.join(root, 'verification', 'scenarios');
export async function open(seed = 12345) {
  const server = await createServer({ root, server: { port: 5298, strictPort: false, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
  await server.listen();
  const base = server.resolvedUrls?.local?.[0] || `http://localhost:${server.config.server.port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(new URL('?test=1', base).href);
  await page.waitForFunction(() => window.__tt?.test?.ready === true, null, { timeout: 180000 });
  await page.evaluate((s) => window.__tt.test.init(s), seed);
  const events = [];
  let tick = 0, last = null;
  const api = {
    events, seed,
    get tick() { return tick; },
    get state() { return last; },
    async step(evs = []) {
      tick++;
      for (const e of evs) events.push({ tick, ...e });
      last = await page.evaluate((e) => window.__tt.test.step(e), evs);
      return last;
    },
    async eval(f, a) { return page.evaluate(f, a); },
    async close() { await browser.close(); await server.close(); },
  };
  return api;
}
export function save(name, api, ticks) {
  const ev = api.events.map((e) => '  ' + JSON.stringify(e)).join(',\n');
  fs.writeFileSync(path.join(scriptsDir, `${name}.json`),
    `{\n"name": "${name}",\n"seed": ${api.seed},\n"ticks": ${ticks},\n"events": [\n${ev}\n]\n}\n`);
}
// menu clicks: [tick, x, y] -> move@t, down@t+2, up@t+4 (template timing)
export function clickMap(list) {
  const m = new Map();
  const add = (t, e) => { if (!m.has(t)) m.set(t, []); m.get(t).push(e); };
  for (const [t, x, y] of list) { add(t, { type: 'move', x, y }); add(t + 2, { type: 'down', x, y }); add(t + 4, { type: 'up', x, y }); }
  return m;
}
export async function runMap(api, m, until) {
  while (api.tick < until) { const t = api.tick + 1; await api.step(m.get(t) || []); }
}
export const FIGHT_MENU = (hero = [108, 302], diff = [124, 355]) => [[30, 300, 381], [130, 300, 383], [230, ...diff], [290, ...hero], [350, 302, 129]];
export const key = (k, down, subMs = 5) => ({ type: 'key', key: k, down, subMs });
