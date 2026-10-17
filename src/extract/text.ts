// Text members: classic fields/buttons (STXT text + field specific data, font map Fmap) and D8 text-xtra
// members (XMED styled text).
import { be16, bes16, be32, beu32, decodeText, hexColor, latin1, normalizeText } from './bytes';
import type { Json } from './lingo';

export type StyleRun = { start: number; fontId: number; fontStyle: number; fontSize: number; color: number };

/**
 * STXT: u32 headerLen (12), u32 textLen, u32 styleLen, text, then u16 runCount and 20-byte runs
 * {u32 startOffset, u16 height, u16 ascent, u16 fontId, u8 style, u8, u16 size, u16 r, u16 g, u16 b}.
 */
export function readStxt(d: Uint8Array): { text: Uint8Array; runs: StyleRun[] } {
  const hdr = be32(d, 0);
  const textLen = be32(d, 4);
  const text = d.subarray(hdr, hdr + textLen);
  const runs: StyleRun[] = [];
  let p = hdr + textLen;
  if (p + 2 <= d.length) {
    const n = be16(d, p);
    p += 2;
    for (let i = 0; i < n && p + 20 <= d.length; i++, p += 20) {
      runs.push({
        start: be32(d, p),
        fontId: be16(d, p + 8),
        fontStyle: d[p + 10],
        fontSize: be16(d, p + 12),
        color: (d[p + 14] << 16) | (d[p + 16] << 8) | d[p + 18],
      });
    }
  }
  return { text, runs };
}

/**
 * Fmap: u32 mapLen, u32 namesLen, map (u32, u32, u32 count, u32, u32, u32, u32, then count x
 * {u32 nameOffset, u16 platform, u16 fontId}), names (16-byte header, then {u32 length, chars} at nameOffset).
 */
export function readFontMap(d: Uint8Array | undefined): Map<number, string> {
  const out = new Map<number, string>();
  if (!d || d.length < 8) return out;
  const mapLen = be32(d, 0);
  const mapStart = 8;
  const namesStart = mapStart + mapLen;
  const count = be32(d, mapStart + 8);
  for (let i = 0; i < count; i++) {
    const e = mapStart + 28 + i * 8;
    if (e + 8 > namesStart) break;
    const nameOff = be32(d, e);
    const fontId = be16(d, e + 6);
    const p = namesStart + nameOff;
    if (p + 4 > d.length) continue;
    const n = be32(d, p);
    out.set(fontId, latin1(d, p + 4, Math.min(d.length, p + 4 + n)));
  }
  return out;
}

/**
 * Field/button specific data (D5+): u8 border, u8 margin, u8 boxShadow, u8 boxType, i16 alignment
 * (0 left, 1 center, -1 right), u16 bg R, u16 bg G, u16 bg B (high bytes used), u16 scroll, i16 rect top/left/
 * bottom/right, ..., [u16 buttonType @28 for buttons].
 */
export function fieldJson(specific: Uint8Array, stxt: Uint8Array | undefined, fonts: Map<number, string>, isButton: boolean): { [k: string]: Json } {
  const j: { [k: string]: Json } = {};
  const t = stxt ? readStxt(stxt) : undefined;
  j.text = t ? normalizeText(t.text) : '';
  const sd = specific;
  if (sd.length >= 28) {
    const align = bes16(sd, 4);
    j.alignment = align === 0 ? 'left' : align === 1 ? 'center' : align === -1 ? 'right' : String(align);
    j.bgColor = hexColor((sd[6] << 16) | (sd[8] << 8) | sd[10]);
    j.rect = [bes16(sd, 16), bes16(sd, 14), bes16(sd, 20), bes16(sd, 18)];
    j.border = sd[0];
    j.margin = sd[1];
    j.boxShadow = sd[2];
    j.boxType = sd[3];
  }
  if (t && t.runs.length) {
    const r = t.runs[0];
    j.font = fonts.get(r.fontId) ?? null;
    j.fontId = r.fontId;
    j.fontSize = r.fontSize;
    j.fontStyle = r.fontStyle;
    j.color = hexColor(r.color);
    if (t.runs.length > 1) j.styleRuns = t.runs.length;
  }
  if (isButton) j.buttonType = sd.length >= 30 ? be16(sd, 28) : 0;
  return j;
}

// ---------------------------------------------------------------------------------------------------------
// XMED (text xtra media). A textual container: "FFFF" + version fields, then sections introduced by 0x03 and
// 20 hex digits (u16 section id, u32 length, u32 record count). Section bodies are value streams: 0x01/0x02
// introduce a hex value (unsigned / signed), 0x81/0x82 repeat the previous value once, 0xC1/0xC2 followed by a
// count byte stand for that many zeros. Section 2 holds the text ("\0" + hex length + "," + chars), section 8
// the font table (hex length "," + Pascal name, per font), section 4/5 the character/paragraph style runs
// (offset, style index), section 6 the character styles and section 7 the paragraph styles.
// Only what the port needs is decoded; this game has a single text-xtra member.

type XmedSection = { id: number; count: number; body: Uint8Array };

function xmedSections(d: Uint8Array): XmedSection[] {
  const out: XmedSection[] = [];
  const isHex = (c: number) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46);
  const starts: number[] = [];
  for (let i = 0; i + 21 <= d.length; i++) {
    if (d[i] !== 0x03) continue;
    let ok = true;
    for (let k = 1; k <= 20 && ok; k++) ok = isHex(d[i + k]);
    if (ok) starts.push(i);
  }
  // A 0x03 count byte after 0xC1/0xC2 can precede hex text; real section headers are not preceded by 0xC1/0xC2.
  const real = starts.filter((s) => s === 0 || (d[s - 1] !== 0xc1 && d[s - 1] !== 0xc2));
  for (let k = 0; k < real.length; k++) {
    const s = real[k];
    const id = parseInt(latin1(d, s + 1, s + 5), 16);
    const count = parseInt(latin1(d, s + 13, s + 21), 16);
    const end = k + 1 < real.length ? real[k + 1] : d.length;
    out.push({ id, count, body: d.subarray(s + 21, end) });
  }
  return out;
}

/** Decodes a value-stream section body into numbers. */
function xmedValues(b: Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  const readHex = () => {
    let s = '';
    while (i < b.length && ((b[i] >= 0x30 && b[i] <= 0x39) || (b[i] >= 0x41 && b[i] <= 0x46) || b[i] === 0x2d)) s += String.fromCharCode(b[i++]);
    return s ? parseInt(s, 16) : 0;
  };
  while (i < b.length) {
    const c = b[i++];
    if (c === 0x01 || c === 0x02) out.push(readHex());
    else if (c === 0x81 || c === 0x82) out.push(out.length ? out[out.length - 1] : 0);
    else if (c === 0xc1 || c === 0xc2) {
      const n = b[i++] ?? 0;
      for (let k = 0; k < n; k++) out.push(0);
    }
  }
  return out;
}

export type XmedText = {
  text: string;
  font: string;
  fontSize: number;
  fontStyle: string;
  alignment: string;
  color: number;
};

export function readXmed(d: Uint8Array): XmedText | undefined {
  const sections = xmedSections(d);
  const sec = (id: number) => sections.find((s) => s.id === id);
  const textSec = sec(2);
  if (!textSec) return undefined;
  // "\0" + hex length + "," + text
  const tb = textSec.body;
  const comma = tb.indexOf(0x2c);
  if (comma < 0) return undefined;
  const textLen = parseInt(latin1(tb, tb[0] === 0 ? 1 : 0, comma), 16);
  const text = normalizeText(tb.subarray(comma + 1, comma + 1 + textLen));
  // Font table: entries "<hex len>," + Pascal name padded to len.
  let font = '';
  const fontSec = sec(8);
  if (fontSec) {
    const fb = fontSec.body;
    const c = fb.indexOf(0x2c);
    if (c >= 0) font = decodeText(fb.subarray(c + 2, c + 2 + fb[c + 1]));
  }
  // Character style 0: [.., .., .., .., size, fontIndex, style bits, ..., R, G, B (16-bit, values 14-16), ...]
  const cs = sec(6) ? xmedValues(sec(6)!.body) : [];
  const fontSize = cs[4] ?? 12;
  const styleBits = cs[6] ?? 0;
  const styles: string[] = [];
  if (styleBits & 1) styles.push('bold');
  if (styleBits & 2) styles.push('italic');
  if (styleBits & 4) styles.push('underline');
  const color = cs.length >= 17 ? ((cs[14] >> 8) << 16) | ((cs[15] >> 8) << 8) | (cs[16] >> 8) : 0;
  // Paragraph runs (section 5: offset, style index) -> paragraph style (section 7) first value = alignment.
  let alignment = 'left';
  const pr = sec(5) ? xmedValues(sec(5)!.body) : [];
  const ps = sec(7);
  if (ps && ps.count > 0) {
    const vals = xmedValues(ps.body);
    const per = Math.floor(vals.length / ps.count);
    const styleIdx = pr.length >= 2 ? pr[1] : 0;
    const a = vals[styleIdx * per] ?? 0;
    alignment = a === 1 ? 'center' : a === 2 ? 'right' : a === 3 ? 'justify' : 'left';
  }
  return { text, font, fontSize, fontStyle: styles.join(','), alignment, color };
}

/**
 * Text xtra member specific data: u32 nameLen, "text", u32 dataLen, then big-endian u32 words; words 9/10 hold
 * the member height/width, word 11 the antialias flag (followed by its 14-point threshold) and word 13 word wrap.
 */
export function textXtraJson(specific: Uint8Array, xmed: Uint8Array | undefined): { [k: string]: Json } {
  const j: { [k: string]: Json } = {};
  const x = xmed ? readXmed(xmed) : undefined;
  if (!x) return j;
  const nameLen = beu32(specific, 0);
  const base = 4 + nameLen + 4;
  const word = (k: number) => (base + k * 4 + 4 <= specific.length ? beu32(specific, base + k * 4) : 0);
  j.text = x.text;
  j.font = x.font;
  j.fontSize = x.fontSize;
  j.fontStyle = x.fontStyle;
  j.alignment = x.alignment;
  j.color = hexColor(x.color);
  j.width = word(10);
  j.height = word(9);
  j.wordWrap = word(13) !== 0;
  j.antialias = word(11) !== 0;
  return j;
}
