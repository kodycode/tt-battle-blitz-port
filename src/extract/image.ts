// Bitmap pixels -> RGBA, with the palette resolved per docs/DATA_FORMAT.md.
import { be16 } from './bytes';
import { decodeDirect, decodeIndices, type BitmapInfo } from './bitmap';
import { systemMac, type BuiltInPalettes } from './palette';

export type ResolvedPalette = { kind: 'cast'; colors: number[] } | { kind: 'system'; id: number };

export type DecodedBitmap = {
  rgba: Uint8ClampedArray;
  /** Paletted (2-8 bit) only: RGB of the first index-0 pixel when some index-0 pixel is not white. */
  index0Color?: number;
  /** Paletted (2-8 bit) only: number of white pixels whose index is not 0. */
  whitePixelsNotIndex0?: number;
};

/**
 * Colour table used for an indexed bitmap. Cast palettes with 256 entries get their black entries 246-255
 * replaced by the Mac system colours there.
 */
function castTable(colors: number[]): number[] {
  if (colors.length !== 256) return colors;
  const mac = systemMac();
  const t = colors.slice();
  for (let k = 246; k < 256; k++) if ((t[k] & 0xffffff) === 0 && (mac[k] & 0xffffff) !== 0) t[k] = mac[k];
  return t;
}

export function decodeBitmap(bitd: Uint8Array, bi: BitmapInfo, pal: ResolvedPalette | undefined, builtIns: BuiltInPalettes): DecodedBitmap {
  const { width: w, height: h, bitDepth: depth } = bi;
  if (depth === 16 || depth === 32) return { rgba: decodeDirect(bitd, w, h, depth) };
  const idx = decodeIndices(bitd, w, h, depth);
  const rgba = new Uint8ClampedArray(w * h * 4);
  const put = (p: number, c: number) => {
    rgba[p * 4] = (c >> 16) & 0xff;
    rgba[p * 4 + 1] = (c >> 8) & 0xff;
    rgba[p * 4 + 2] = c & 0xff;
    rgba[p * 4 + 3] = 255;
  };
  if (depth === 1) {
    // 1-bit: set bits black, clear bits white (Director tints them with the sprite colours at draw time).
    for (let p = 0; p < idx.length; p++) put(p, idx[p] ? 0x000000 : 0xffffff);
    return { rgba };
  }
  let table: number[];
  let map: (i: number) => number = (i) => i;
  if (!pal) table = [];
  else if (pal.kind === 'cast') table = depth === 8 ? castTable(pal.colors) : pal.colors;
  else {
    table = builtIns.get(pal.id);
    // Low-depth bitmaps on a 256-colour system palette spread their indices over the table (2-bit: 0, 85, 170, 255).
    if (depth < 8) {
      const step = 255 / ((1 << depth) - 1);
      map = (i) => i * step;
    }
  }
  let whiteNon0 = 0;
  let idx0Color: number | undefined;
  let idx0NotWhite = false;
  for (let p = 0; p < idx.length; p++) {
    const i = idx[p];
    const c = table[map(i)] ?? 0;
    put(p, c);
    const white = (c & 0xffffff) === 0xffffff;
    if (white && i !== 0) whiteNon0++;
    if (i === 0) {
      if (idx0Color === undefined) idx0Color = c;
      if (!white) idx0NotWhite = true;
    }
  }
  const out: DecodedBitmap = { rgba };
  if (idx0NotWhite) out.index0Color = idx0Color;
  if (whiteNon0) out.whitePixelsNotIndex0 = whiteNon0;
  return out;
}

/** Width/height from the first JPEG SOFn marker. */
export function jpegSize(j: Uint8Array): { width: number; height: number } | undefined {
  for (let o = 2; o + 9 < j.length; ) {
    if (j[o] !== 0xff) {
      o++;
      continue;
    }
    const mk = j[o + 1];
    if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) return { height: be16(j, o + 5), width: be16(j, o + 7) };
    o += 2 + be16(j, o + 2);
  }
  return undefined;
}
