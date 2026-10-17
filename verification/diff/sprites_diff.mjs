// Sprite-state comparer: compares two sprites.json dumps tick by tick (projector: run_projector.py --sprites,
// port: scripts/run_port.mjs --sprites --batch 1; same format) and reports the first tick / channel /
// field where they differ, plus per-field totals.
//
// Usage: node verification/diff/sprites_diff.mjs <a/sprites.json | a dir> <b/sprites.json | b dir> [options]
//   --from N / --to N    tick range (default: all ticks present in both)
//   --offset N           compare b tick t with a tick t+N (default 0)
//   --ch LIST            only these channels (e.g. 11-15,40)
//   --ignore LIST        fields to skip (comma separated: member,rect,ink,locZ,visible,puppet,loc,blend,flipH,
//                        flipV,rotation,behaviors,presence)
//   --tol N              numeric tolerance for loc/rect components (default 0)
//   --max N              list at most N differences (default 40; the first one is always the first in tick order)
//   --json FILE          also write every difference as JSON
// A null field (the projector side has `behaviors: null`) is never compared. "presence" = a channel listed on
// one side only. Exit code: 0 identical, 1 differences found, 2 usage / input error.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opts = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
if (pos.length < 2) {
  console.error('usage: node verification/diff/sprites_diff.mjs <a sprites.json|dir> <b sprites.json|dir> [--from N] [--to N] [--offset N] [--ch 1-150] [--ignore f,..] [--tol N] [--max N] [--json out.json]');
  process.exit(2);
}
const num = (k, d) => (opts[k] !== undefined && isFinite(Number(opts[k])) ? Number(opts[k]) : d);
const resolve = (p) => (fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'sprites.json') : p);
const load = (p) => {
  const f = resolve(p);
  if (!fs.existsSync(f)) {
    console.error('missing ' + f);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};
const A = load(pos[0]);
const B = load(pos[1]);
const OFFSET = num('offset', 0);
const TOL = num('tol', 0);
const MAX = num('max', 40);
const ignore = new Set((opts.ignore || '').split(',').filter(Boolean));
let chFilter = null;
if (opts.ch) {
  chFilter = new Set();
  for (const part of opts.ch.split(',')) {
    const [lo, hi] = part.split('-').map(Number);
    for (let c = lo; c <= (hi || lo); c++) chFilter.add(c);
  }
}

const FIELDS = ['member', 'loc', 'rect', 'ink', 'blend', 'locZ', 'visible', 'puppet', 'flipH', 'flipV', 'rotation', 'behaviors'];
const nums = (s) => String(s).match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
function same(field, a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return true;
  if ((field === 'loc' || field === 'rect') && TOL > 0) {
    const x = nums(a), y = nums(b);
    return x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= TOL);
  }
  if (field === 'member') return String(a).split(' ')[0] === String(b).split(' ')[0]; // castLib:member decides
  return JSON.stringify(a) === JSON.stringify(b);
}

const ticksB = Object.keys(B).map(Number).sort((x, y) => x - y);
const from = num('from', -Infinity), to = num('to', Infinity);
const diffs = [];
const perField = {};
const perTick = new Map();
let compared = 0;
for (const tb of ticksB) {
  const ta = tb + OFFSET;
  if (tb < from || tb > to || !(String(ta) in A)) continue;
  const la = A[ta], lb = B[tb];
  if (!Array.isArray(la) || !Array.isArray(lb)) continue;
  compared++;
  const ma = new Map(la.map((s) => [s.ch, s]));
  const mb = new Map(lb.map((s) => [s.ch, s]));
  const chs = [...new Set([...ma.keys(), ...mb.keys()])].filter((c) => !chFilter || chFilter.has(c)).sort((x, y) => x - y);
  for (const ch of chs) {
    const sa = ma.get(ch), sb = mb.get(ch);
    const add = (field, va, vb) => {
      diffs.push({ tick: tb, tickA: ta, ch, field, a: va, b: vb, memberA: sa?.member ?? null, memberB: sb?.member ?? null });
      perField[field] = (perField[field] || 0) + 1;
      perTick.set(tb, (perTick.get(tb) || 0) + 1);
    };
    if (!sa || !sb) {
      if (!ignore.has('presence')) add('presence', sa ? 'present' : 'absent', sb ? 'present' : 'absent');
      continue;
    }
    for (const f of FIELDS) if (!ignore.has(f) && !same(f, sa[f], sb[f])) add(f, sa[f], sb[f]);
  }
}

const nameA = path.basename(path.dirname(path.resolve(resolve(pos[0]))));
const nameB = path.basename(path.dirname(path.resolve(resolve(pos[1]))));
console.log(`sprites: a=${nameA} b=${nameB}, ${compared} ticks compared${OFFSET ? ` (offset ${OFFSET})` : ''}${ignore.size ? `, ignoring ${[...ignore].join(',')}` : ''}${TOL ? `, tol ${TOL}` : ''}`);
if (!diffs.length) {
  console.log('identical');
  process.exit(0);
}
const f0 = diffs[0];
console.log(`first difference: tick ${f0.tick} channel ${f0.ch} field ${f0.field}: a=${JSON.stringify(f0.a)} b=${JSON.stringify(f0.b)}  [a ${f0.memberA} | b ${f0.memberB}]`);
console.log(`${diffs.length} differences in ${perTick.size} ticks; per field: ${Object.entries(perField).map(([k, v]) => `${k} ${v}`).join(', ')}`);
// Differences grouped into runs: same channel + field + values over consecutive ticks print once.
const runs = [];
const open = new Map();
const tickIndex = new Map(ticksB.map((t, i) => [t, i]));
for (const d of diffs) {
  const key = `${d.ch}|${d.field}|${JSON.stringify(d.a)}|${JSON.stringify(d.b)}`;
  const r = open.get(key);
  if (r && tickIndex.get(r.last) === tickIndex.get(d.tick) - 1) r.last = d.tick;
  else {
    const nr = { first: d.tick, last: d.tick, d };
    runs.push(nr);
    open.set(key, nr);
  }
}
runs.sort((x, y) => x.first - y.first || x.d.ch - y.d.ch);
console.log(`${runs.length} runs (same channel/field/values over consecutive ticks):`);
for (const r of runs.slice(0, MAX)) {
  const d = r.d;
  const span = r.first === r.last ? `tick ${r.first}` : `ticks ${r.first}-${r.last}`;
  console.log(`  ${span} ch ${d.ch} ${d.field}: a=${JSON.stringify(d.a)} b=${JSON.stringify(d.b)}  [${d.memberA ?? '-'}${d.memberB && d.memberB !== d.memberA ? ' | ' + d.memberB : ''}]`);
}
if (runs.length > MAX) console.log(`  ... ${runs.length - MAX} more (--max N)`);
if (opts.json) fs.writeFileSync(opts.json, JSON.stringify(diffs, null, 0).replace(/\},\{/g, '},\n{'));
process.exit(1);
