// Post-processing step for scoredump: re-decode the 4-bit paletted bitmaps from their BITD chunks.
//
// LibreShockwave's decodeBitmap maps every non-zero 4-bit index to black (only index 0 survives), and
// scoredump's "independent decode" check uses the same decoder, so all 55 4-bit bitmaps of this game were
// shipped wrong: hud_score_number_0..9, win_screen endtext_0..9 and char_Jinx FX_jinx_energyball_*.
// Verified against the original Projector: the fight-screen score digits show exactly
// palette[index] of this decode (e.g. row "13 9 5 5 5 5 5 4" = 111604 75991e 7da420 ... 192106).
// The 2- and 8-bit decodes of the same routine match the shipped PNGs pixel for pixel.
//
//
// Palette fixes (PALETTE_FIXES below): the extractor mis-read one CLUT chunk. char_Jinx member 53
// "j_exp.01 Palette" (CLUT chunk 285 of char_Jinx.cct, the palette of the 35 4-bit FX_jinx_energyball_*
// bitmaps) came out as #78fb1f #be08ef #8373fe ...: those are the still zlib-compressed chunk bytes
// (0x78 = zlib header) read as 16-bit RGB. The real CLUT (ProjectorRays `decompile --dump-chunks`,
// CLUT-285.bin) is a white -> pink -> black ramp, and Director maps 4-bit index i straight to CLUT entry i:
// the original projector shows exactly these pinks (index 1 (255,247,255), 2 (255,239,255), 5 (249,157,221),
// 6 (255,107,206), 7 (181,148,181), 12 (255,49,156)) in the energy balls. Index 0 is white, so these
// bitmaps key white with ink 36 like every other bitmap (their `index0Color` is dropped). All other CLUT
// chunks of game.dcr and the char_*.cct casts match their raw chunk (checked the same way).
//
// Usage (from the repo root, after scoredump):  node research/scoredump/fix_4bit_bitmaps.cjs [--check]
// Reads public/data/casts.json and local/assets/<file>/manifest.tsv + raw_chunks/*_BITD.bin, overwrites
// public/<url> for each 4-bit bitmap whose pixels differ, and patches casts.json in place for the palette
// fixes (palette colours, index0Color of the bitmaps using them). --check only reports.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const { PNG } = require(path.join(root, 'node_modules', 'pngjs'));
const castsPath = path.join(root, 'public/data/casts.json');
const casts = JSON.parse(fs.readFileSync(castsPath, 'utf8'));
const checkOnly = process.argv.includes('--check');

// "<castLib name>:<member number>" -> correct colours (raw CLUT entries, 16-bit components -> 8 bit).
const PALETTE_FIXES = {
  'char_Jinx:53': ['#ffffff', '#fff7ff', '#ffefff', '#ffceff', '#f2d7ef', '#f99ddd', '#ff6bce', '#b594b5',
    '#ff63ce', '#f065c2', '#d45daa', '#867485', '#ff319c', '#d73185', '#85476e', '#000000'],
};

// Apply the palette fixes to the in-memory casts and to casts.json (line by line: casts.json keeps one
// member per line, so only the affected lines are rewritten and the file layout stays as scoredump wrote it).
{
  const fixedPal = new Map(); // "castLibNumber:member" -> colours
  for (const [key, colors] of Object.entries(PALETTE_FIXES)) {
    const [libName, num] = key.split(':');
    const lib = casts.castLibs.find((c) => c.name === libName);
    const pm = lib?.members.find((m) => m.number === Number(num) && m.type === 'palette');
    if (!pm) {
      console.warn(`palette fix ${key}: no such palette member`);
      continue;
    }
    fixedPal.set(`${lib.number}:${pm.number}`, colors);
  }
  const patchMember = (castLibNumber, m) => {
    let changed = false;
    const pal = fixedPal.get(`${castLibNumber}:${m.number}`);
    if (m.type === 'palette' && pal && JSON.stringify(m.colors) !== JSON.stringify(pal)) {
      m.colors = pal.slice();
      changed = true;
    }
    if (m.type === 'bitmap' && m.palette && !m.palette.system && fixedPal.has(`${m.palette.castLib}:${m.palette.member}`)) {
      const c0 = fixedPal.get(`${m.palette.castLib}:${m.palette.member}`)[0];
      if (c0 === '#ffffff' && 'index0Color' in m) {
        delete m.index0Color;
        changed = true;
      } else if (c0 !== '#ffffff' && m.index0Color !== c0) {
        m.index0Color = c0;
        changed = true;
      }
    }
    return changed;
  };
  let patched = 0;
  for (const lib of casts.castLibs) for (const m of lib.members) if (patchMember(lib.number, m)) patched++;
  if (patched) {
    console.log(`palette fixes: ${patched} casts.json members ${checkOnly ? 'differ' : 'patched'}`);
    if (!checkOnly) {
      const lines = fs.readFileSync(castsPath, 'utf8').split('\n');
      let libNumber = 0;
      for (let i = 0; i < lines.length; i++) {
        const lm = /^ {3}"number":(\d+),\s*$/.exec(lines[i]);
        if (lm) libNumber = Number(lm[1]);
        const t = lines[i].trim();
        if (!t.startsWith('{"number":')) continue;
        const comma = t.endsWith(',');
        const m = JSON.parse(comma ? t.slice(0, -1) : t);
        const lib = casts.castLibs.find((c) => c.number === libNumber);
        const cur = lib?.members.find((x) => x.number === m.number);
        if (!cur) continue;
        const s = JSON.stringify(cur);
        if (s !== JSON.stringify(m)) lines[i] = lines[i].slice(0, lines[i].indexOf('{')) + s + (comma ? ',' : '');
      }
      fs.writeFileSync(castsPath, lines.join('\n'));
    }
  }
}

const manifests = new Map();
function bitdPath(dir, chunkId) {
  if (!manifests.has(dir)) {
    const m = new Map();
    for (const line of fs.readFileSync(path.join(root, 'local', 'assets', dir, 'manifest.tsv'), 'utf8').split(/\r?\n/).slice(1)) {
      const f = line.split('\t');
      if (f[5] === 'BITD') m.set(f[0], f[6]);
    }
    manifests.set(dir, m);
  }
  const rel = manifests.get(dir).get(String(chunkId));
  return rel ? path.join(root, 'local', 'assets', dir, rel) : null;
}

// BITD: rows of rowBytes (word aligned), PackBits-compressed unless the chunk is exactly rowBytes*height.
function decodeIndices(buf, w, h, depth) {
  const rb = depth === 8 ? w + (w & 1) : Math.ceil((w * depth) / 16) * 2;
  let data = buf;
  if (buf.length !== rb * h) {
    const out = [];
    let i = 0;
    while (i < buf.length && out.length < rb * h) {
      const n = buf[i++];
      if (n < 128) for (let k = 0; k <= n; k++) out.push(buf[i++]);
      else if (n > 128) {
        const v = buf[i++];
        for (let k = 0; k < 257 - n; k++) out.push(v);
      }
    }
    data = out;
  }
  const per = 8 / depth;
  const mask = (1 << depth) - 1;
  const idx = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const byte = data[y * rb + Math.floor(x / per)] ?? 0;
      idx[y * w + x] = (byte >> (8 - depth * ((x % per) + 1))) & mask;
    }
  return idx;
}

let fixed = 0;
let same = 0;
for (const cl of casts.castLibs) {
  const dir = cl.fileName ? cl.fileName.replace(/\.(cct|cst)$/i, '') : 'game';
  for (const m of cl.members) {
    if (m.type !== 'bitmap' || m.bitDepth !== 4 || !m.url || !m.palette || m.palette.system) continue;
    const pal = casts.castLibs[m.palette.castLib - 1]?.members.find((x) => x.number === m.palette.member);
    const file = bitdPath(dir, m.chunkId);
    if (!pal || !pal.colors || !file) {
      console.warn(`skip ${cl.name} ${m.number} ${m.name}: no palette/BITD`);
      continue;
    }
    const cols = pal.colors.map((s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)));
    const idx = decodeIndices(fs.readFileSync(file), m.width, m.height, 4);
    const png = new PNG({ width: m.width, height: m.height });
    for (let p = 0; p < idx.length; p++) {
      const c = cols[idx[p]] || [0, 0, 0];
      png.data[p * 4] = c[0];
      png.data[p * 4 + 1] = c[1];
      png.data[p * 4 + 2] = c[2];
      png.data[p * 4 + 3] = 255;
    }
    const target = path.join(root, 'public', m.url);
    const cur = PNG.sync.read(fs.readFileSync(target));
    let diff = cur.width !== png.width || cur.height !== png.height;
    for (let i = 0; !diff && i < png.data.length; i++) if (cur.data[i] !== png.data[i]) diff = true;
    if (!diff) {
      same++;
      continue;
    }
    fixed++;
    console.log(`${checkOnly ? 'differs' : 'fixed'}: ${cl.name} ${m.number} ${m.name}`);
    if (!checkOnly) fs.writeFileSync(target, PNG.sync.write(png, { colorType: 2 }));
  }
}
console.log(`4-bit bitmaps: ${fixed} ${checkOnly ? 'differ' : 'rewritten'}, ${same} already correct`);
