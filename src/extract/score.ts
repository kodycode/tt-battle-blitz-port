// Score (VWSC) decoding for the main movie and film loops (Director 7/8 layout: 48-byte channel records,
// 6 main channels + N sprite channels), interval/behaviour tables, and frame labels (VWLB).
// Output format: docs/DATA_FORMAT.md "score.json".
import { be16, bes16, be32, decodeText, hexColor } from './bytes';
import { g6, initializerText, parseLingoLiteral, type Json } from './lingo';
import { builtInPaletteName } from './palette';

export type NameOf = (castLib: number, member: number) => string | null;

/**
 * VWSC container: u32 totalLength, i32, i32, u32 entryCount, u32, u32 entrySizeSum, then entryCount + 1 u32
 * offsets (relative to the end of the offset table) delimiting the entries.
 */
export function readScoreEntries(d: Uint8Array): Uint8Array[] {
  const count = be32(d, 12);
  const offBase = 24;
  const dataBase = offBase + (count + 1) * 4;
  const out: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const a = be32(d, offBase + i * 4);
    const b = be32(d, offBase + (i + 1) * 4);
    out.push(d.subarray(dataBase + a, dataBase + Math.max(a, b)));
  }
  return out;
}

type SpriteRec = {
  spriteType: number;
  ink: number;
  trails: number;
  stretch: number;
  fore: number;
  back: number;
  castLib: number;
  member: number;
  listIdx: number;
  locV: number;
  locH: number;
  height: number;
  width: number;
  colorFlags: number;
  blendByte: number;
  thickness: number;
  foreG: number;
  backG: number;
  foreB: number;
  backB: number;
  rot: number;
  skew: number;
};

const REC_KEYS: (keyof SpriteRec)[] = [
  'spriteType', 'ink', 'trails', 'stretch', 'fore', 'back', 'castLib', 'member', 'listIdx', 'locV', 'locH', 'height',
  'width', 'colorFlags', 'blendByte', 'thickness', 'foreG', 'backG', 'foreB', 'backB', 'rot', 'skew',
];
const sameRec = (a: SpriteRec, b: SpriteRec) => REC_KEYS.every((k) => a[k] === b[k]);

/**
 * Sprite channel record (48 bytes): u8 type, u8 ink (0x40 trails, 0x80 stretch), u8 fore, u8 back, u16 castLib,
 * u16 member, u32 interval index, i16 locV, i16 locH, u16 height, u16 width, u8 colour flags, u8 blend,
 * u8 flags (low nibble line thickness, 0x20 flipH, 0x40 flipV; 0x80 = continuation, masked), u8, u8 foreG,
 * u8 backG, u8 foreB, u8 backB, i32 rotation * 100, i32 skew * 100.
 */
function readSprite(d: Uint8Array, o: number): SpriteRec {
  return {
    spriteType: d[o],
    ink: d[o + 1] & 0x3f,
    trails: (d[o + 1] >> 6) & 1,
    stretch: (d[o + 1] >> 7) & 1,
    fore: d[o + 2],
    back: d[o + 3],
    castLib: be16(d, o + 4),
    member: be16(d, o + 6),
    listIdx: be32(d, o + 8),
    locV: bes16(d, o + 12),
    locH: bes16(d, o + 14),
    height: be16(d, o + 16),
    width: be16(d, o + 18),
    colorFlags: d[o + 20],
    blendByte: d[o + 21],
    thickness: d[o + 22] & 0x7f,
    foreG: d[o + 24],
    backG: d[o + 25],
    foreB: d[o + 26],
    backB: d[o + 27],
    rot: be32(d, o + 28),
    skew: be32(d, o + 32),
  };
}

type Interval = { start: number; end: number; channel: number; behaviors: Json[]; used: boolean };
type Run = { from: number; to: number; r: SpriteRec };
type Span = { channel: number; start: number; end: number; listIdx: number; runs: Run[] };
type MainRun = { from: number; to: number; rec: Uint8Array };

export type ScoreResult = {
  frameCount: number;
  framesVersion: number;
  recSize: number;
  numChannels: number;
  mainChannels: number;
  decodedFrames: number;
  maxChannelUsed: number;
  sprites: Json[];
  frameScripts: Json[];
  paletteRuns: Json[];
  otherMain: { [k: string]: Json };
  nonEmptyOtherMain: number;
  initFailed: string[];
};

const bytesEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

export function decodeScore(ents: Uint8Array[], nameOf: NameOf, selfCastLib = 0): ScoreResult {
  const res: ScoreResult = {
    frameCount: 0,
    framesVersion: 0,
    recSize: 0,
    numChannels: 0,
    mainChannels: 6,
    decodedFrames: 0,
    maxChannelUsed: 0,
    sprites: [],
    frameScripts: [],
    paletteRuns: [],
    otherMain: {},
    nonEmptyOtherMain: 0,
    initFailed: [],
  };
  if (ents.length < 2 || ents[0].length < 20 || ents[1].length < 4) return res;
  const e0 = ents[0];
  // entries[0]: u32 len, u32, u32 frameCount, u16 framesVersion, u16 recSize, u16 numChannels, u16, frame deltas
  const frameCount = (res.frameCount = be32(e0, 8));
  res.framesVersion = be16(e0, 12);
  const recSize = (res.recSize = be16(e0, 14));
  const numChannels = (res.numChannels = be16(e0, 16));
  const mainChannels = res.mainChannels;
  const frameBytes = numChannels * recSize;

  // entries[1]: u32 count, count x interval entry index. Interval entry: i32 start, i32 end, i32, i32,
  // i32 raw channel, ...; the next entry holds the behaviours (u16 castLib, u16 member, u32 initializer entry).
  const intervals = new Map<number, Interval>();
  const ivCount = be32(ents[1], 0);
  for (let k = 1; k <= ivCount; k++) {
    const idx = be32(ents[1], k * 4);
    if (idx <= 0 || idx >= ents.length || ents[idx].length < 20) continue;
    const p = ents[idx];
    const iv: Interval = { start: be32(p, 0), end: be32(p, 4), channel: be32(p, 16), behaviors: [], used: false };
    if (idx + 1 < ents.length) {
      const b = ents[idx + 1];
      for (let o = 0; o + 8 <= b.length; o += 8) {
        const bl = be16(b, o);
        const bm = be16(b, o + 2);
        const init = be32(b, o + 4);
        if (bl === 0 && bm === 0) continue;
        const bj: { [k: string]: Json } = { castLib: bl, member: bm, name: nameOf(bl, bm) };
        if (init > 0 && init < ents.length && ents[init].length) {
          const raw = initializerText(ents[init]);
          const parsed = parseLingoLiteral(raw);
          bj.paramsRaw = raw;
          bj.params = parsed.value;
          if (!parsed.ok) res.initFailed.push(raw);
        } else {
          bj.paramsRaw = null;
          bj.params = null;
        }
        iv.behaviors.push(bj);
      }
    }
    intervals.set(idx, iv);
  }

  // Frame deltas: per frame u16 length, then {u16 size, u16 offset, bytes} patches onto the previous frame.
  const openSpan = new Map<number, number>();
  const spans: Span[] = [];
  const mainRuns: MainRun[][] = [];
  for (let ch = 0; ch < mainChannels; ch++) mainRuns.push([]);
  const cur = new Uint8Array(frameBytes);
  let pos = 20;
  for (let f = 1; f <= frameCount && pos + 2 <= e0.length; f++) {
    const len = be16(e0, pos);
    const end = pos + len;
    pos += 2;
    while (pos + 4 <= end) {
      const sz = be16(e0, pos);
      const off = be16(e0, pos + 2);
      pos += 4;
      if (off + sz <= cur.length && pos + sz <= e0.length) cur.set(e0.subarray(pos, pos + sz), off);
      pos += sz;
    }
    pos = end;
    res.decodedFrames++;
    for (let ch = 0; ch < mainChannels; ch++) {
      const rec = cur.slice(ch * recSize, (ch + 1) * recSize);
      const runs = mainRuns[ch];
      const last = runs[runs.length - 1];
      if (last && last.to === f - 1 && bytesEqual(last.rec, rec)) last.to = f;
      else runs.push({ from: f, to: f, rec });
    }
    for (let ch = mainChannels; ch < numChannels; ch++) {
      const r = readSprite(cur, ch * recSize);
      const open = openSpan.get(ch);
      if (r.castLib === 0 && r.member === 0 && r.listIdx === 0) {
        if (open !== undefined) openSpan.delete(ch);
        continue;
      }
      res.maxChannelUsed = Math.max(res.maxChannelUsed, ch - mainChannels + 1);
      if (open !== undefined && spans[open].listIdx === r.listIdx && spans[open].end === f - 1) {
        const sp = spans[open];
        sp.end = f;
        const last = sp.runs[sp.runs.length - 1];
        if (sameRec(last.r, r)) last.to = f;
        else sp.runs.push({ from: f, to: f, r });
      } else {
        spans.push({ channel: ch, start: f, end: f, listIdx: r.listIdx, runs: [{ from: f, to: f, r }] });
        openSpan.set(ch, spans.length - 1);
      }
    }
  }

  const blendPct = (b: number) => (b <= 0 ? 100 : b >= 255 ? 0 : Math.round(((255 - b) * 100) / 255));
  const colorJ = (idx: number, rgb: boolean, g: number, b: number): Json => (rgb ? hexColor((idx << 16) | (g << 8) | b) : idx);

  for (const sp of spans) {
    const iv = intervals.get(sp.listIdx);
    let behaviors: Json[] = [];
    if (iv) {
      iv.used = true;
      behaviors = iv.behaviors;
    }
    const states: Json[] = [];
    for (const run of sp.runs) {
      const r = run.r;
      const lib = (r.castLib === 0 || r.castLib === 0xffff) && selfCastLib > 0 && r.member ? selfCastLib : r.castLib;
      const s: { [k: string]: Json } = {
        from: run.from,
        to: run.to,
        castLib: lib,
        member: r.member,
        memberName: nameOf(lib, r.member),
        locH: r.locH,
        locV: r.locV,
        width: r.width,
        height: r.height,
        ink: r.ink,
        blend: blendPct(r.blendByte),
      };
      if (r.blendByte) s.blendRaw = r.blendByte;
      if (r.trails) s.trails = true;
      if (r.thickness !== 1) s.flagsRaw = r.thickness;
      if (r.stretch) s.stretch = true;
      if (r.thickness & 0x20) s.flipH = true;
      if (r.thickness & 0x40) s.flipV = true;
      const foreRgb = ((r.colorFlags >> 4) & 1) !== 0;
      const backRgb = ((r.colorFlags >> 4) & 2) !== 0;
      if (foreRgb || r.fore !== 255) s.foreColor = colorJ(r.fore, foreRgb, r.foreG, r.foreB);
      if (backRgb || r.back !== 0) s.backColor = colorJ(r.back, backRgb, r.backG, r.backB);
      if (r.rot) s.rotation = g6(r.rot / 100);
      if (r.skew) s.skew = g6(r.skew / 100);
      states.push(s);
    }
    res.sprites.push({
      channel: sp.channel - mainChannels + 1,
      startFrame: sp.start,
      endFrame: sp.end,
      behaviors,
      states,
    });
  }

  // Frame script channel (raw 0): u16 castLib, u16 member, u32 interval index.
  for (const run of mainRuns[0]) {
    const lib = be16(run.rec, 0);
    const mem = be16(run.rec, 2);
    const li = be32(run.rec, 4);
    if (lib === 0 && mem === 0) continue;
    const iv = intervals.get(li);
    if (iv) iv.used = true;
    res.frameScripts.push({
      startFrame: run.from,
      endFrame: run.to,
      castLib: lib,
      member: mem,
      name: nameOf(lib, mem),
      behaviors: iv ? iv.behaviors : [],
    });
  }
  // Palette channel (raw 5): i16 castLib, i16 member, u8 rate, u8 flags, ..., u32 interval index at +16.
  for (const run of mainRuns[5]) {
    const lib = bes16(run.rec, 0);
    const mem = bes16(run.rec, 2);
    if (lib === 0 && mem === 0) continue;
    const j: { [k: string]: Json } = { startFrame: run.from, endFrame: run.to, castLib: lib, member: mem };
    if (lib > 0) j.name = nameOf(lib, mem);
    else {
      const sym = builtInPaletteName(mem);
      if (sym) j.system = sym;
    }
    j.rate = run.rec[4];
    j.flags = run.rec[5];
    res.paletteRuns.push(j);
  }
  // Main channels 1-4 (tempo / transition / sound1 / sound2): emitted raw when non-zero.
  for (let ch = 1; ch <= 4; ch++) {
    const arr: Json[] = [];
    for (const run of mainRuns[ch]) {
      if (run.rec.every((b) => b === 0)) continue;
      let hex = '';
      for (const b of run.rec) hex += b.toString(16).padStart(2, '0');
      arr.push({ startFrame: run.from, endFrame: run.to, rawHex: hex });
      res.nonEmptyOtherMain++;
    }
    res.otherMain['raw' + ch] = arr;
  }
  return res;
}

export type Label = { frame: number; name: string };

/** VWLB: u16 count, count x {u16 frame, u16 offset}, u32 text length, label text (offsets delimit names). */
export function readLabels(d: Uint8Array | undefined): Label[] {
  if (!d || d.length < 2) return [];
  const count = be16(d, 0);
  const base = 2 + count * 4 + 4;
  const textLen = be32(d, 2 + count * 4);
  const out: Label[] = [];
  for (let i = 0; i < count; i++) {
    const frame = be16(d, 2 + i * 4);
    const off = be16(d, 2 + i * 4 + 2);
    const next = i + 1 < count ? be16(d, 2 + (i + 1) * 4 + 2) : textLen;
    out.push({ frame, name: decodeText(d.subarray(base + off, base + next)) });
  }
  return out;
}
