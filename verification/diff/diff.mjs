// Capture diff: compares two capture sets (default local/captures/<scenario>/projector vs .../port, see
// docs/VERIFICATION.md) tick by tick, auto-aligns a constant tick offset, and writes <capture dir>/report.html.
//
// Usage: node verification/diff/diff.mjs <scenario | capture dir> [options]
//   --a <side> / --b <side>   reference / candidate side names (default projector / port)
//   --a-dir <dir> --b-dir <dir> --out <dir>   compare arbitrary capture dirs (each holding frames/ [+ frames.json])
//   --pix N         a pixel "differs" when its max channel difference is > N (default 24)
//   --tick-pct P    a tick is divergent when more than P % of its pixels differ (default 0.5)
//   --offset N      fixed offset (candidate tick t <-> reference tick t+N) instead of auto-alignment
//   --search N      auto-alignment searches offsets -N..N (default 30)
//   --align-ticks N auto-alignment uses candidate ticks 1..N (default 200)
//   --samples N     max divergent ticks shown with images (default 60)
//   --amp N         amplification of the difference image (default 8)
// Exit code: 0 = compared (divergent or not), 2 = usage / input error.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..'); // project root (verification/diff/ -> ../..)
const require = createRequire(path.join(root, 'package.json'));
const { PNG } = require('pngjs');

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opts = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const num = (k, d) => (opts[k] !== undefined && isFinite(Number(opts[k])) ? Number(opts[k]) : d);
const PIX = num('pix', 24);
const TICK_PCT = num('tick-pct', 0.5);
const SEARCH = num('search', 30);
const ALIGN_TICKS = num('align-ticks', 200);
const SAMPLES = num('samples', 60);
const AMP = num('amp', 8);
const sideA = opts.a || 'projector';
const sideB = opts.b || 'port';

// --a-dir / --b-dir each override one side independently.
let dirA, dirB, outDir, scenario;
if (opts['a-dir'] && opts['b-dir'] && !pos[0]) {
  dirA = path.resolve(opts['a-dir']);
  dirB = path.resolve(opts['b-dir']);
  outDir = path.resolve(opts.out || path.join(path.dirname(dirB)));
  scenario = path.basename(outDir);
} else {
  if (!pos[0]) {
    console.error('usage: node verification/diff/diff.mjs <scenario | capture dir> [--a projector --b port] [--a-dir A] [--b-dir B] [--pix 24] [--tick-pct 0.5] ...');
    process.exit(2);
  }
  const capDir = fs.existsSync(pos[0]) && fs.statSync(pos[0]).isDirectory() ? path.resolve(pos[0]) : path.join(root, 'local', 'captures', pos[0]);
  scenario = path.basename(capDir);
  dirA = opts['a-dir'] ? path.resolve(opts['a-dir']) : path.join(capDir, sideA);
  dirB = opts['b-dir'] ? path.resolve(opts['b-dir']) : path.join(capDir, sideB);
  outDir = path.resolve(opts.out || capDir);
}
const labelA = opts['a-dir'] ? path.basename(dirA) : sideA;
const labelB = opts['b-dir'] ? path.basename(dirB) : sideB;

function loadSide(dir) {
  const framesDir = path.join(dir, 'frames');
  if (!fs.existsSync(framesDir)) {
    console.error('missing ' + framesDir);
    process.exit(2);
  }
  const files = new Map();
  for (const f of fs.readdirSync(framesDir)) {
    const m = /^(\d+)\.png$/i.exec(f);
    if (m) files.set(Number(m[1]), path.join(framesDir, f));
  }
  let meta = null;
  const mj = path.join(dir, 'frames.json');
  if (fs.existsSync(mj)) {
    try {
      meta = JSON.parse(fs.readFileSync(mj, 'utf8'));
    } catch (e) {
      console.warn(`bad ${mj}: ${e.message}`);
    }
  }
  const state = new Map();
  for (const t of meta?.ticks || []) state.set(t.tick, t);
  return { dir, files, meta, state, maxTick: Math.max(0, ...files.keys()) };
}
const A = loadSide(dirA);
const B = loadSide(dirB);

// ---------------------------------------------------------------- images
// Decoded as { width, height, data: RGBA Buffer } (pngjs normalises RGB/palette/16-bit input to RGBA).
const readPng = (file) => PNG.sync.read(fs.readFileSync(file));

const TW = 100;
const TH = 67;
function thumb(img) {
  const out = new Float32Array(TW * TH * 3);
  const sx = img.width / TW;
  const sy = img.height / TH;
  for (let ty = 0; ty < TH; ty++) {
    const y0 = Math.floor(ty * sy);
    const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * sy));
    for (let tx = 0; tx < TW; tx++) {
      const x0 = Math.floor(tx * sx);
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * sx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      const o = (ty * TW + tx) * 3;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
    }
  }
  return out;
}
const thumbDiff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

// Mean absolute channel difference (0..255) and % of pixels whose max channel difference > PIX.
function compare(a, b) {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  let sum = 0;
  let over = 0;
  for (let y = 0; y < h; y++) {
    let ia = y * a.width * 4;
    let ib = y * b.width * 4;
    for (let x = 0; x < w; x++, ia += 4, ib += 4) {
      const dr = Math.abs(a.data[ia] - b.data[ib]);
      const dg = Math.abs(a.data[ia + 1] - b.data[ib + 1]);
      const db = Math.abs(a.data[ia + 2] - b.data[ib + 2]);
      sum += dr + dg + db;
      if (Math.max(dr, dg, db) > PIX) over++;
    }
  }
  const n = w * h || 1;
  return { mean: sum / (3 * n), pct: (100 * over) / n, sizeMismatch: a.width !== b.width || a.height !== b.height };
}

// Difference image: the reference dimmed to grey, differing pixels in red (amplified), > PIX in yellow.
function diffImage(a, b) {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ia = (y * a.width + x) * 4;
      const ib = (y * b.width + x) * 4;
      const o = (y * w + x) * 4;
      const d = Math.max(Math.abs(a.data[ia] - b.data[ib]), Math.abs(a.data[ia + 1] - b.data[ib + 1]), Math.abs(a.data[ia + 2] - b.data[ib + 2]));
      const base = Math.round((0.299 * a.data[ia] + 0.587 * a.data[ia + 1] + 0.114 * a.data[ia + 2]) * 0.25);
      const v = Math.min(255, d * AMP);
      out.data[o] = Math.max(base, v);
      out.data[o + 1] = d > PIX ? Math.max(base, Math.min(255, v * 0.8)) : base;
      out.data[o + 2] = base;
      out.data[o + 3] = 255;
    }
  return PNG.sync.write(out, { colorType: 2, inputColorType: 6, inputHasAlpha: true });
}

// ---------------------------------------------------------------- alignment
const t0 = Date.now();
let offset = 0;
let alignScores = [];
if (opts.offset !== undefined) {
  offset = Math.trunc(num('offset', 0));
} else {
  const thumbs = new Map();
  const getThumb = (side, tick) => {
    const key = side === A ? 'a' + tick : 'b' + tick;
    if (!thumbs.has(key)) thumbs.set(key, side.files.has(tick) ? thumb(readPng(side.files.get(tick))) : null);
    return thumbs.get(key);
  };
  const bTicks = [...B.files.keys()].filter((t) => t <= ALIGN_TICKS).sort((x, y) => x - y);
  for (let off = -SEARCH; off <= SEARCH; off++) {
    let s = 0;
    let n = 0;
    for (const t of bTicks) {
      if (!A.files.has(t + off)) continue;
      s += thumbDiff(getThumb(A, t + off), getThumb(B, t));
      n++;
    }
    if (n >= Math.max(1, Math.floor(bTicks.length / 2))) alignScores.push({ off, score: s / n, n });
  }
  alignScores.sort((x, y) => x.score - y.score || Math.abs(x.off) - Math.abs(y.off));
  // Static screens make many offsets tie; prefer the smallest |offset| among (near-)equal scores.
  if (alignScores.length) {
    const best = alignScores[0].score;
    const ties = alignScores.filter((s) => s.score <= best + 1e-6);
    ties.sort((x, y) => Math.abs(x.off) - Math.abs(y.off) || x.off - y.off);
    offset = ties[0].off;
  }
}

// ---------------------------------------------------------------- per-tick comparison
const results = [];
const bTicksAll = [...B.files.keys()].sort((x, y) => x - y);
let sizeMismatch = false;
for (const t of bTicksAll) {
  const ta = t + offset;
  if (!A.files.has(ta)) continue;
  const r = compare(readPng(A.files.get(ta)), readPng(B.files.get(t)));
  if (r.sizeMismatch) sizeMismatch = true;
  const fa = A.state.get(ta)?.frame;
  const fb = B.state.get(t)?.frame;
  results.push({ tick: t, tickA: ta, mean: r.mean, pct: r.pct, divergent: r.pct > TICK_PCT, frameA: fa ?? null, frameB: fb ?? null });
}
const divergent = results.filter((r) => r.divergent);
const firstDiv = divergent[0] || null;
const firstAny = results.find((r) => r.pct > 0) || null;
const firstFrameMismatch = results.find((r) => r.frameA != null && r.frameB != null && r.frameA !== r.frameB) || null;
const maxR = results.reduce((m, r) => (!m || r.pct > m.pct ? r : m), null);
const meanAll = results.length ? results.reduce((s, r) => s + r.mean, 0) / results.length : 0;
const identical = results.filter((r) => r.mean === 0).length;

// ---------------------------------------------------------------- sampled image triples
function sample(list, cap) {
  if (list.length <= cap) return list.slice();
  const head = Math.min(20, Math.floor(cap / 3));
  const out = list.slice(0, head);
  const rest = list.slice(head);
  const k = cap - head;
  for (let i = 0; i < k; i++) out.push(rest[Math.floor((i * rest.length) / k)]);
  if (maxR && maxR.divergent && !out.includes(maxR)) out[out.length - 1] = maxR;
  return [...new Set(out)].sort((x, y) => x.tick - y.tick);
}
const shown = sample(divergent, SAMPLES);
const filesDir = path.join(outDir, 'report_files');
// Files are overwritten in place (never deleted); use a fresh --out dir to avoid stale samples.
fs.mkdirSync(filesDir, { recursive: true });
const pad = (n) => String(n).padStart(6, '0');
for (const r of shown) {
  const fa = A.files.get(r.tickA);
  const fb = B.files.get(r.tick);
  fs.copyFileSync(fa, path.join(filesDir, `a_${pad(r.tickA)}.png`));
  fs.copyFileSync(fb, path.join(filesDir, `b_${pad(r.tick)}.png`));
  fs.writeFileSync(path.join(filesDir, `d_${pad(r.tick)}.png`), diffImage(readPng(fa), readPng(fb)));
}

// ---------------------------------------------------------------- report
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function graph(key, title, unit, threshold) {
  const W = 1000, H = 180, L = 50, R = 10, T = 12, Bm = 24;
  if (!results.length) return '<p>(no overlapping ticks)</p>';
  const t1 = results[0].tick;
  const t2 = results[results.length - 1].tick;
  const maxV = Math.max(threshold ? threshold * 2 : 0, ...results.map((r) => r[key]), 1e-9);
  const X = (t) => L + ((t - t1) / Math.max(1, t2 - t1)) * (W - L - R);
  const Y = (v) => T + (1 - v / maxV) * (H - T - Bm);
  const pts = results.map((r) => `${X(r.tick).toFixed(1)},${Y(r[key]).toFixed(1)}`).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="graph" role="img" aria-label="${esc(title)}">`;
  s += `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - Bm}" class="plot"/>`;
  for (let i = 0; i <= 4; i++) {
    const v = (maxV * i) / 4;
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 4}" y="${Y(v) + 4}" text-anchor="end">${v < 10 ? v.toFixed(2) : v.toFixed(0)}</text>`;
  }
  const step = Math.max(1, Math.ceil((t2 - t1) / 10 / 30) * 30);
  for (let t = Math.ceil(t1 / step) * step; t <= t2; t += step) s += `<text x="${X(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`;
  if (threshold) s += `<line x1="${L}" x2="${W - R}" y1="${Y(threshold)}" y2="${Y(threshold)}" class="thr"/>`;
  if (firstDiv) s += `<line x1="${X(firstDiv.tick)}" x2="${X(firstDiv.tick)}" y1="${T}" y2="${H - Bm}" class="first"/>`;
  if (firstFrameMismatch) s += `<line x1="${X(firstFrameMismatch.tick)}" x2="${X(firstFrameMismatch.tick)}" y1="${T}" y2="${H - Bm}" class="fm"/>`;
  s += `<polyline points="${pts}" class="line"/>`;
  s += `<text x="${L + 6}" y="${T + 14}" class="title">${esc(title)} (${esc(unit)})</text></svg>`;
  return s;
}
const fmtState = (st) => {
  if (!st) return '';
  const f = st.fight;
  let s = `frame ${st.frame ?? '?'}`;
  if (st.screen != null) s += `, screen ${st.screen}`;
  if (f) {
    const p = (x) => (x ? `x ${x.x?.toFixed?.(1)} y ${x.y?.toFixed?.(1)} move ${x.currMove} hp ${x.health}` : '-');
    s += `<br>P: ${p(f.player)}<br>E: ${p(f.enemy)}<br>clock ${f.clock}`;
  }
  return s;
};
const row = (k, v) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`;
const verdict = !results.length ? 'no overlapping ticks' : firstDiv ? `DIVERGES at ${labelB} tick ${firstDiv.tick} (${labelA} tick ${firstDiv.tickA})` : 'no divergent ticks';
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Oracle diff ${esc(scenario)}</title><style>
:root{--bg:#fff;--fg:#1d1d1f;--mut:#666;--line:#2563eb;--grid:#e5e7eb;--thr:#d97706;--first:#dc2626;--fm:#7c3aed;--card:#f6f7f9}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#e8e8ea;--mut:#9a9aa0;--line:#60a5fa;--grid:#2c2c30;--thr:#f59e0b;--first:#f87171;--fm:#a78bfa;--card:#1d1d21}}
body{background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;margin:16px auto;max-width:1240px;padding:0 16px}
h1{font-size:20px}h2{font-size:16px;margin-top:28px}table{border-collapse:collapse}th,td{text-align:left;padding:3px 10px 3px 0;vertical-align:top}
th{color:var(--mut);font-weight:500}.verdict{font-weight:600;font-size:16px}.graph{width:100%;height:auto;display:block;margin:8px 0}
.graph text{font-size:11px;fill:var(--mut)}.graph .title{fill:var(--fg);font-size:12px}.plot{fill:none;stroke:var(--grid)}.grid{stroke:var(--grid)}
.line{fill:none;stroke:var(--line);stroke-width:1.2}.thr{stroke:var(--thr);stroke-dasharray:4 3}.first{stroke:var(--first)}.fm{stroke:var(--fm);stroke-dasharray:2 2}
.legend span{margin-right:14px}.sw{display:inline-block;width:14px;height:3px;vertical-align:middle;margin-right:4px}
.tick{background:var(--card);border-radius:8px;padding:10px;margin:12px 0}.imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.imgs img{width:100%;image-rendering:pixelated;display:block}.imgs figure{margin:0}.imgs figcaption{color:var(--mut);font-size:12px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--mut);margin-top:6px}
@media (max-width:700px){.imgs{grid-template-columns:1fr}}
</style></head><body>
<h1>Oracle diff: ${esc(scenario)}</h1>
<p class="verdict">${esc(verdict)}</p>
<table>
${row('reference (A)', esc(A.dir))}
${row('candidate (B)', esc(B.dir))}
${row('tick offset', `${offset} (${labelB} tick t &harr; ${labelA} tick t${offset >= 0 ? '+' : ''}${offset})${opts.offset !== undefined ? ' [fixed]' : alignScores.length ? ` [auto: best ${alignScores.slice(0, 3).map((s) => `${s.off}: ${s.score.toFixed(3)}`).join(', ')}]` : ''}`)}
${row('ticks compared', `${results.length} (A has ${A.files.size}, B has ${B.files.size})`)}
${row('thresholds', `pixel differs if max channel diff &gt; ${PIX}; tick divergent if &gt; ${TICK_PCT}% pixels differ`)}
${row('first divergent tick', firstDiv ? `${labelB} ${firstDiv.tick} / ${labelA} ${firstDiv.tickA}: ${firstDiv.pct.toFixed(2)}% pixels, mean ${firstDiv.mean.toFixed(2)}` : 'none')}
${row('first tick with any differing pixel', firstAny ? `${labelB} ${firstAny.tick} / ${labelA} ${firstAny.tickA}: ${firstAny.pct.toFixed(3)}% pixels, mean ${firstAny.mean.toFixed(3)}` : 'none')}
${row('divergent ticks', `${divergent.length} of ${results.length}`)}
${row('pixel-identical ticks', `${identical} of ${results.length}`)}
${row('worst tick', maxR ? `${labelB} ${maxR.tick}: ${maxR.pct.toFixed(2)}% pixels, mean ${maxR.mean.toFixed(2)}` : '-')}
${row('mean abs diff (all ticks)', meanAll.toFixed(3))}
${row('first score-frame mismatch', firstFrameMismatch ? `${labelB} tick ${firstFrameMismatch.tick}: frame ${firstFrameMismatch.frameA} (${labelA}) vs ${firstFrameMismatch.frameB} (${labelB})` : A.meta && B.meta ? 'none' : 'n/a (frames.json missing)')}
${sizeMismatch ? row('WARNING', 'frame sizes differ; only the overlapping area was compared') : ''}
</table>
<h2>Per-tick difference</h2>
<p class="legend"><span><i class="sw" style="background:var(--line)"></i>difference</span><span><i class="sw" style="background:var(--thr)"></i>divergence threshold</span><span><i class="sw" style="background:var(--first)"></i>first divergent tick</span><span><i class="sw" style="background:var(--fm)"></i>first score-frame mismatch</span> (x axis: ${esc(labelB)} tick)</p>
${graph('pct', '% pixels differing', '%', TICK_PCT)}
${graph('mean', 'mean absolute difference', '0-255', 0)}
<h2>Divergent ticks${divergent.length > shown.length ? ` (${shown.length} sampled of ${divergent.length})` : ''}</h2>
${shown.length ? '' : '<p>none</p>'}
${shown
  .map(
    (r) => `<div class="tick" id="t${r.tick}"><b>${esc(labelB)} tick ${r.tick}</b> (${esc(labelA)} tick ${r.tickA}) &mdash; ${r.pct.toFixed(2)}% pixels differ, mean ${r.mean.toFixed(2)}
<div class="imgs"><figure><a href="report_files/a_${pad(r.tickA)}.png"><img loading="lazy" src="report_files/a_${pad(r.tickA)}.png" alt="${esc(labelA)} tick ${r.tickA}"></a><figcaption>${esc(labelA)}</figcaption></figure>
<figure><a href="report_files/b_${pad(r.tick)}.png"><img loading="lazy" src="report_files/b_${pad(r.tick)}.png" alt="${esc(labelB)} tick ${r.tick}"></a><figcaption>${esc(labelB)}</figcaption></figure>
<figure><a href="report_files/d_${pad(r.tick)}.png"><img loading="lazy" src="report_files/d_${pad(r.tick)}.png" alt="difference"></a><figcaption>difference &times;${AMP}</figcaption></figure></div>
<div class="meta"><div>${esc(labelA)}: ${fmtState(A.state.get(r.tickA))}</div><div>${esc(labelB)}: ${fmtState(B.state.get(r.tick))}</div></div></div>`,
  )
  .join('\n')}
</body></html>`;
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'report.html');
fs.writeFileSync(reportPath, html);

// ---------------------------------------------------------------- stdout summary
console.log(`scenario ${scenario}: ${labelA} vs ${labelB}`);
console.log(`  offset ${offset}${opts.offset !== undefined ? ' (fixed)' : alignScores.length ? ` (auto; best ${alignScores.slice(0, 3).map((s) => `${s.off}:${s.score.toFixed(3)}`).join(' ')})` : ''}`);
console.log(`  ticks compared ${results.length}, divergent ${divergent.length}, pixel-identical ${identical}, mean abs diff ${meanAll.toFixed(3)}`);
console.log(`  ${verdict}${firstDiv ? ` (${firstDiv.pct.toFixed(2)}% px, mean ${firstDiv.mean.toFixed(2)})` : ''}`);
if (firstAny && firstAny !== firstDiv) console.log(`  first tick with any pixel over threshold: ${labelB} ${firstAny.tick} (${firstAny.pct.toFixed(3)}% px)`);
if (firstFrameMismatch) console.log(`  first score-frame mismatch at ${labelB} tick ${firstFrameMismatch.tick}: ${firstFrameMismatch.frameA} vs ${firstFrameMismatch.frameB}`);
if (sizeMismatch) console.log('  WARNING: frame sizes differ');
console.log(`  report ${reportPath} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
