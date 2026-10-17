// Compares Director's stage update region (run_projector.py --region-trace: REGION lines in agent_diag.txt) with
// the port's (frames.json `region`, one rect list per tick, run_port.mjs).
// Usage: node verification/diff/region_diff.mjs <projector capture dir> <port capture dir> [--max N] [--from N] [--to N]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const max = Number(opt('--max', 20));
const from = Number(opt('--from', 1));
const to = Number(opt('--to', Infinity));
const [aDir, bDir] = args;
if (!aDir || !bDir) {
  console.error('usage: node region_diff.mjs <projector dir> <port dir> [--max N] [--from N] [--to N]');
  process.exit(2);
}
const dir = new Map(); // tick -> list of rect lists (a tick may flush more than once)
for (const line of fs.readFileSync(path.join(aDir, 'agent_diag.txt'), 'utf8').split(/\r?\n/)) {
  const m = /^REGION t=(\d+) dirty=(-?\d+) (\d+):(.*)$/.exec(line);
  if (!m) continue;
  const t = Number(m[1]);
  const rects = m[2] === '0' ? [] : [...m[4].matchAll(/\[(-?\d+),(-?\d+),(-?\d+),(-?\d+)\]/g)].map((x) => x.slice(1, 5).map(Number));
  if (!dir.has(t)) dir.set(t, []);
  dir.get(t).push(rects);
}
const port = new Map();
for (const r of JSON.parse(fs.readFileSync(path.join(bDir, 'frames.json'), 'utf8')).ticks) port.set(r.tick, r.region ?? null);
const key = (l) => l.map((r) => r.join(',')).join(' ');
let same = 0, diff = 0, skipped = 0, shown = 0;
const ticks = [...port.keys()].filter((t) => t >= from && t <= to).sort((a, b) => a - b);
const diffTicks = [];
for (const t of ticks) {
  const d = dir.get(t);
  const p = port.get(t);
  if (!d || !p) {
    skipped++;
    continue;
  }
  if (d.length !== 1) {
    skipped++; // several flushes in one tick (transitions): not comparable
    continue;
  }
  if (key(d[0]) === key(p)) same++;
  else {
    diff++;
    diffTicks.push(t);
    if (shown++ < max) console.log(`t${t}\n  dir  ${key(d[0]) || '-'}\n  port ${key(p) || '-'}`);
  }
}
console.log(`regions: ${same} identical, ${diff} different, ${skipped} skipped (of ${ticks.length})`);
if (diffTicks.length) console.log('different ticks: ' + diffTicks.slice(0, 200).join(' ') + (diffTicks.length > 200 ? ' ...' : ''));
