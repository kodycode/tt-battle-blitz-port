// Verifies the TypeScript extractor (src/extract) against the data files in public/:
//   node scripts/verify_extract.mjs [path/to/ttbattleblitz.zip] [--verbose]
// Default zip: local/original/ttbattleblitz.zip. Compares casts.json / score.json (deep equality, first differing
// path), every PNG pixel for pixel (pngjs), every MP3 and JPEG byte for byte, and reports the extraction time.
// The extractor is bundled on the fly with esbuild (a Vite dependency), so no build step is needed.
import { build } from 'esbuild';
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pngjs from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const zipPath = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, 'local', 'original', 'ttbattleblitz.zip'));
const pub = join(root, 'public');
if (!existsSync(zipPath)) {
  console.log(`zip not found: ${zipPath}`);
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'tt-extract-'));
const bundle = join(tmp, 'extract.mjs');
await build({
  entryPoints: [join(root, 'src', 'extract', 'index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: bundle,
  logLevel: 'error',
});
const { extractGame, stringifyData } = await import(pathToFileURL(bundle).href);
rmSync(tmp, { recursive: true, force: true });

const zip = new Uint8Array(readFileSync(zipPath));
const t0 = performance.now();
const out = await extractGame(zip);
const ms = performance.now() - t0;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log('FAIL ' + msg);
};

// First differing path between two JSON values (key order ignored).
function firstDiff(a, b, path = '$') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || Array.isArray(a) !== Array.isArray(b))
    return `${path}: ${JSON.stringify(a)?.slice(0, 200)} != ${JSON.stringify(b)?.slice(0, 200)}`;
  if (typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b) ? null : `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) {
        const d = firstDiff(a[i], b[i], `${path}[${i}]`);
        if (d) return d;
      }
      return `${path}: length ${a.length} != ${b.length}`;
    }
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  for (const k of kb) if (!(k in a)) return `${path}.${k}: missing (expected ${JSON.stringify(b[k])?.slice(0, 200)})`;
  for (const k of ka) if (!(k in b)) return `${path}.${k}: unexpected ${JSON.stringify(a[k])?.slice(0, 200)}`;
  for (const k of kb) {
    const d = firstDiff(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

// Pass through JSON so the comparison sees exactly what a JSON writer would produce.
const roundTrip = (v) => JSON.parse(JSON.stringify(v));
for (const [name, value] of [['casts.json', out.casts], ['score.json', out.score]]) {
  const ref = JSON.parse(readFileSync(join(pub, 'data', name), 'utf8'));
  const d = firstDiff(roundTrip(value), ref);
  if (d) fail(`${name}: ${d}`);
  else console.log(`ok   ${name} deep-equal`);
  // Bonus: the file text in the original layout (stringifyData) is byte-identical too.
  const text = stringifyData(value, name === 'casts.json' ? 4 : 2);
  const refText = readFileSync(join(pub, 'data', name), 'utf8');
  if (text === refText) console.log(`ok   ${name} text byte-identical (stringifyData)`);
  else console.log(`note ${name}: values equal but text layout differs`);
}

// Media referenced by the reference casts.json.
const ref = JSON.parse(readFileSync(join(pub, 'data', 'casts.json'), 'utf8'));
const wantPng = new Set();
const wantMp3 = new Set();
const wantJpg = new Set();
for (const lib of ref.castLibs)
  for (const m of lib.members) {
    if (m.type === 'bitmap' && m.url) (m.format === 'jpeg' ? wantJpg : wantPng).add(m.url);
    if (m.type === 'bitmap' && m.alphaUrl) wantPng.add(m.alphaUrl);
    if (m.type === 'sound' && m.url) wantMp3.add(m.url);
  }

let pngOk = 0;
const badPng = [];
for (const url of wantPng) {
  const img = out.images.get(url);
  if (!img) {
    badPng.push(`${url}: missing`);
    continue;
  }
  const png = pngjs.PNG.sync.read(readFileSync(join(pub, url)));
  if (png.width !== img.width || png.height !== img.height) {
    badPng.push(`${url}: size ${img.width}x${img.height} != ${png.width}x${png.height}`);
    continue;
  }
  let diff = -1;
  let count = 0;
  for (let i = 0; i < png.data.length; i++)
    if (png.data[i] !== img.rgba[i]) {
      if (diff < 0) diff = i;
      count++;
    }
  if (diff < 0) pngOk++;
  else {
    const p = diff >> 2;
    const px = (d) => Array.from(d.subarray(p * 4, p * 4 + 4)).map((v) => v.toString(16).padStart(2, '0')).join('');
    badPng.push(`${url}: ${count} bytes differ, first at pixel (${p % png.width},${Math.floor(p / png.width)}) got ${px(img.rgba)} want ${px(png.data)}`);
  }
}
for (const url of out.images.keys()) if (!wantPng.has(url)) badPng.push(`${url}: not in reference`);
if (badPng.length) {
  fail(`images: ${badPng.length} mismatches (${pngOk}/${wantPng.size} identical)`);
  for (const b of badPng.slice(0, verbose ? Infinity : 25)) console.log('     ' + b);
} else console.log(`ok   images: ${pngOk}/${wantPng.size} pixel-identical`);

function compareBytes(label, want, got) {
  let ok = 0;
  const bad = [];
  for (const url of want) {
    const g = got.get(url);
    if (!g) {
      bad.push(`${url}: missing`);
      continue;
    }
    const r = readFileSync(join(pub, url));
    if (r.length === g.length && Buffer.from(g.buffer, g.byteOffset, g.byteLength).equals(r)) ok++;
    else bad.push(`${url}: ${g.length} bytes != ${r.length}`);
  }
  for (const url of got.keys()) if (!want.has(url)) bad.push(`${url}: not in reference`);
  if (bad.length) {
    fail(`${label}: ${bad.length} mismatches (${ok}/${want.size} identical)`);
    for (const b of bad.slice(0, verbose ? Infinity : 25)) console.log('     ' + b);
  } else console.log(`ok   ${label}: ${ok}/${want.size} byte-identical`);
}
compareBytes('sounds', wantMp3, out.sounds);
compareBytes('jpegs', wantJpg, out.jpegs);

if (out.warnings.length) {
  console.log(`warnings (${out.warnings.length}):`);
  for (const w of out.warnings.slice(0, verbose ? Infinity : 20)) console.log('     ' + w);
}
console.log(`extraction time: ${ms.toFixed(0)} ms (Node ${process.version})`);
if (process.env.VERIFY_DUMP) writeFileSync(process.env.VERIFY_DUMP, JSON.stringify({ casts: out.casts, score: out.score }));
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
