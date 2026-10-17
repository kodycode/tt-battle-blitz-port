// Byte-level helpers shared by the extractor modules (Uint8Array/DataView only, no Node APIs).

export class Reader {
  readonly view: DataView;
  pos = 0;
  constructor(readonly data: Uint8Array, public littleEndian = false, pos = 0) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.pos = pos;
  }
  get length(): number {
    return this.data.length;
  }
  eof(): boolean {
    return this.pos >= this.data.length;
  }
  u8(): number {
    return this.data[this.pos++];
  }
  i8(): number {
    return (this.data[this.pos++] << 24) >> 24;
  }
  u16(): number {
    const v = this.view.getUint16(this.pos, this.littleEndian);
    this.pos += 2;
    return v;
  }
  i16(): number {
    const v = this.view.getInt16(this.pos, this.littleEndian);
    this.pos += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.pos, this.littleEndian);
    this.pos += 4;
    return v;
  }
  i32(): number {
    const v = this.view.getInt32(this.pos, this.littleEndian);
    this.pos += 4;
    return v;
  }
  /** Afterburner variable-length integer: 7 bits per byte, most significant first, high bit = more. */
  varint(): number {
    let v = 0;
    let b: number;
    do {
      b = this.data[this.pos++];
      v = v * 128 + (b & 0x7f);
    } while (b & 0x80);
    return v;
  }
  /** Four-character tag, read as a 32-bit integer in the reader's byte order (so "XFIR" files yield "RIFX"-style tags). */
  fourcc(): string {
    return fourccToString(this.u32());
  }
  bytes(n: number): Uint8Array {
    const b = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  skip(n: number): void {
    this.pos += n;
  }
}

export function fourccToString(v: number): string {
  return String.fromCharCode((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
}

export const be16 = (d: Uint8Array, o: number): number => (d[o] << 8) | d[o + 1];
export const bes16 = (d: Uint8Array, o: number): number => (be16(d, o) << 16) >> 16;
export const be32 = (d: Uint8Array, o: number): number => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) | 0;
export const beu32 = (d: Uint8Array, o: number): number => be32(d, o) >>> 0;

export function latin1(d: Uint8Array, start = 0, end = d.length): string {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(d[i]);
  return s;
}

/** True when the bytes are well-formed UTF-8 (lead/continuation byte structure only). */
export function isValidUtf8(d: Uint8Array): boolean {
  let i = 0;
  while (i < d.length) {
    const c = d[i];
    const n = c < 0x80 ? 0 : c >> 5 === 6 ? 1 : c >> 4 === 14 ? 2 : c >> 3 === 30 ? 3 : -1;
    if (n < 0) return false;
    for (let k = 1; k <= n; k++) if (i + k >= d.length || d[i + k] >> 6 !== 2) return false;
    i += n + 1;
  }
  return true;
}

const CP1252_HI = [
  0x20ac, 0, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0, 0x017d, 0, 0,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0, 0x017e, 0x0178,
];

/** Bytes -> JS string: UTF-8 when valid, else Windows-1252 (the movie was authored on Windows). */
export function decodeText(d: Uint8Array): string {
  if (isValidUtf8(d)) return new TextDecoder('utf-8').decode(d);
  let s = '';
  for (const c of d) {
    let cp = c;
    if (c >= 0x80 && c < 0xa0 && CP1252_HI[c - 0x80]) cp = CP1252_HI[c - 0x80];
    s += String.fromCharCode(cp);
  }
  return s;
}

/** Text member normalisation: strip trailing NULs, decode, CR / CRLF -> LF. */
export function normalizeText(d: Uint8Array): string {
  let end = d.length;
  while (end > 0 && d[end - 1] === 0) end--;
  return decodeText(d.subarray(0, end)).replace(/\r\n?/g, '\n');
}

export function hexColor(rgb: number): string {
  return '#' + (rgb & 0xffffff).toString(16).padStart(6, '0');
}

/** Asset file stem rule: ASCII alphanumerics, '-' and '_' kept; other runs collapse to one '_' (not leading/trailing); max 80. */
export function sanitize(name: string): string {
  const bytes = new TextEncoder().encode(name);
  let r = '';
  let us = false;
  for (const c of bytes) {
    const ok = (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || c === 0x2d || c === 0x5f;
    if (ok) {
      r += String.fromCharCode(c);
      us = false;
    } else if (!us && r.length) {
      r += '_';
      us = true;
    }
  }
  r = r.replace(/_+$/, '');
  if (!r) r = 'member';
  if (r.length > 80) r = r.slice(0, 80);
  return r;
}
