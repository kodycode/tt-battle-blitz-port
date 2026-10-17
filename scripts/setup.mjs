// npm run setup: writes the development and verification data (public/data/*.json, public/assets/**) from the
// original release, ttbattleblitz.zip, with the TypeScript extractor (docs/EXTRACTION.md).
// Usage: npm run setup [-- <path/to/ttbattleblitz.zip>] [--check]
//   zip      default: local/original/ttbattleblitz.zip, else the download cache .cache/ttbattleblitz.zip,
//            else it is downloaded from the Internet Archive into .cache/ (git-ignored)
//   --check  compare against the existing files instead of writing (JSON bytes, PNG pixels, MP3/JPEG bytes)
//   --out <dir>  output root instead of public/
// Files whose content is already identical are left alone; others are overwritten in place, never deleted.
// JSON uses the layout described in docs/DATA_FORMAT.md; PNGs are RGB for 4-bit bitmaps and RGBA otherwise.
import { createServer } from 'vite';
import { PNG } from 'pngjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ZIP_NAME = 'ttbattleblitz.zip';
const ZIP_URL = 'https://archive.org/download/ttbattleblitz/ttbattleblitz.zip';
const ZIP_SHA1 = 'b41c01eeedcef3c707decef5a52ffeff7de93dd5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, '.cache');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const publicDir = outIdx >= 0 ? path.resolve(args.splice(outIdx, 2)[1]) : path.join(root, 'public');
const check = args.includes('--check');
const zipArg = args.find((a) => !a.startsWith('--'));

const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

async function download(dest) {
  console.log(`downloading ${ZIP_URL} ...`);
  const r = await fetch(ZIP_URL, { redirect: 'follow' });
  if (!r.ok) fail(`download failed: HTTP ${r.status} ${r.statusText}`);
  const total = Number(r.headers.get('content-length')) || 0;
  const chunks = [];
  let got = 0;
  let lastLog = 0;
  for await (const c of r.body) {
    chunks.push(c);
    got += c.length;
    if (Date.now() - lastLog > 1000) {
      lastLog = Date.now();
      console.log(`  ${(got / 1e6).toFixed(1)}${total ? ` / ${(total / 1e6).toFixed(1)}` : ''} MB`);
    }
  }
  const buf = Buffer.concat(chunks);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`  saved ${dest}`);
  return buf;
}

async function getZip() {
  const candidates = zipArg ? [path.resolve(zipArg)] : [path.join(root, 'local', 'original', ZIP_NAME), path.join(cacheDir, ZIP_NAME)];
  for (const p of candidates) {
    if (!fs.existsSync(p)) {
      if (zipArg) fail(`no such file: ${p}`);
      continue;
    }
    const buf = fs.readFileSync(p);
    const h = sha1(buf);
    if (h === ZIP_SHA1) return { buf, from: p };
    if (zipArg) fail(`${p} is not the expected ${ZIP_NAME} (SHA-1 ${h}, expected ${ZIP_SHA1})`);
    console.warn(`ignoring ${p}: SHA-1 ${h} does not match ${ZIP_SHA1}`);
  }
  const buf = await download(path.join(cacheDir, ZIP_NAME));
  const h = sha1(buf);
  if (h !== ZIP_SHA1) fail(`downloaded file has SHA-1 ${h}, expected ${ZIP_SHA1}`);
  return { buf, from: ZIP_URL };
}

// The data files' JSON layout (docs/DATA_FORMAT.md): 1-space indents down to prettyDepth
// (casts 4, score 2), deeper values on one line, no spaces, doubles as %.6g, minimal string escapes.
function escapeJson(s) {
  let o = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"') o += '\\"';
    else if (ch === '\\') o += '\\\\';
    else if (ch === '\n') o += '\\n';
    else if (ch === '\r') o += '\\r';
    else if (ch === '\t') o += '\\t';
    else if (c < 0x20) o += '\\u' + c.toString(16).padStart(4, '0');
    else o += ch;
  }
  return o + '"';
}
function formatNumber(x) {
  if (Number.isInteger(x)) return String(x);
  let s = x.toPrecision(6);
  if (s.includes('e')) {
    let [m, e] = s.split('e');
    if (m.includes('.')) m = m.replace(/0+$/, '').replace(/\.$/, '');
    s = `${m}e${Number(e) < 0 ? '-' : '+'}${String(Math.abs(Number(e))).padStart(2, '0')}`;
  } else if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}
function toDataJson(j, prettyDepth, depth = 0) {
  const nl = (d) => (depth < prettyDepth ? '\n' + ' '.repeat(d) : '');
  if (j === null || j === undefined) return 'null';
  if (typeof j === 'boolean') return String(j);
  if (typeof j === 'number') return formatNumber(j);
  if (typeof j === 'string') return escapeJson(j);
  if (Array.isArray(j)) return '[' + j.map((x) => nl(depth + 1) + toDataJson(x, prettyDepth, depth + 1)).join(',') + (j.length ? nl(depth) : '') + ']';
  const keys = Object.keys(j).filter((k) => j[k] !== undefined);
  return '{' + keys.map((k) => nl(depth + 1) + escapeJson(k) + ':' + toDataJson(j[k], prettyDepth, depth + 1)).join(',') + (keys.length ? nl(depth) : '') + '}';
}

// --------------------------------------------------------------------------------------------------------
const { buf: zip, from } = await getZip();
console.log(`zip: ${from} (SHA-1 ok)`);

// The extractor is TypeScript; Vite's SSR loader runs it in Node without a build step.
const server = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
let game;
try {
  const ex = await server.ssrLoadModule('/src/data/extractor.ts');
  const t0 = Date.now();
  let lastLog = 0;
  game = await ex.extractGame(new Uint8Array(zip.buffer, zip.byteOffset, zip.length), (done, total, stage) => {
    if (Date.now() - lastLog > 1000 || done === total) {
      lastLog = Date.now();
      process.stdout.write(`  ${stage} ${done}/${total}\r`);
    }
  });
  console.log(`\nextracted in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${game.images.size} images, ${game.sounds.size} sounds, ${game.jpegs?.size ?? 0} jpegs`);
} finally {
  await server.close();
}

// Which bitmaps are written as RGB PNGs: 4-bit with a cast palette.
const rgbUrls = new Set();
for (const cl of game.casts.castLibs)
  for (const m of cl.members) if (m.type === 'bitmap' && m.url && m.bitDepth === 4 && m.palette && !m.palette.system) rgbUrls.add(m.url);

const stats = { written: 0, unchanged: 0, same: 0, differ: 0, missing: 0 };
const differ = [];
const target = (rel) => path.join(publicDir, ...rel.split('/'));
const put = (rel, bytes, sameAsExisting) => {
  const file = target(rel);
  if (check) {
    if (!fs.existsSync(file)) {
      stats.missing++;
      differ.push(`${rel} (missing)`);
    } else if (sameAsExisting(fs.readFileSync(file))) stats.same++;
    else {
      stats.differ++;
      differ.push(rel);
    }
    return;
  }
  if (fs.existsSync(file) && sameAsExisting(fs.readFileSync(file))) {
    stats.unchanged++;
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes());
  stats.written++;
};
const bytesEqual = (a) => (b) => Buffer.compare(Buffer.from(a), b) === 0;

for (const [name, json, depth] of [['casts.json', game.casts, 4], ['score.json', game.score, 2]]) {
  const text = toDataJson(json, depth);
  put(`data/${name}`, () => text, (old) => old.toString('utf8') === text);
}
for (const [url, im] of game.images) {
  put(
    url,
    () => {
      const png = new PNG({ width: im.width, height: im.height });
      Buffer.from(im.rgba.buffer, im.rgba.byteOffset, im.rgba.length).copy(png.data);
      return PNG.sync.write(png, { colorType: rgbUrls.has(url) ? 2 : 6 });
    },
    (old) => {
      const p = PNG.sync.read(old);
      return p.width === im.width && p.height === im.height && Buffer.compare(p.data, Buffer.from(im.rgba.buffer, im.rgba.byteOffset, im.rgba.length)) === 0;
    },
  );
}
for (const [url, b] of game.sounds) put(url, () => b, bytesEqual(b));
for (const [url, b] of game.jpegs ?? []) put(url, () => b, bytesEqual(b));

if (check) {
  console.log(`check: ${stats.same} identical, ${stats.differ} differ, ${stats.missing} missing`);
  for (const d of differ.slice(0, 40)) console.log('  ' + d);
  process.exit(stats.differ || stats.missing ? 1 : 0);
}
console.log(`${publicDir}: wrote ${stats.written} files, ${stats.unchanged} already up to date`);
