// Bitmap members: CASt specific data and BITD pixel data.
import { be16, bes16 } from './bytes';

export type BitmapInfo = {
  rowBytes: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
  regX: number;
  regY: number;
  flags: number;
  bitDepth: number;
  clutCastLib: number;
  clutId: number;
  alphaThreshold: number;
  useAlpha: boolean;
};

/**
 * Bitmap specific data (D7/D8, big-endian): u16 rowBytes (bit 15 = depth/palette fields present),
 * i16 rect top/left/bottom/right, u8 alphaThreshold, 7 bytes, i16 regY, i16 regX, u8 flags,
 * [u8 bitDepth, i16 clutCastLib, i16 clutId]. Without bit 15 the bitmap is 1-bit and has no palette fields;
 * the data records clutCastLib 0 / clutId 1 (member 1 of the bitmap's own cast).
 */
export function readBitmapInfo(s: Uint8Array): BitmapInfo {
  const pitch = be16(s, 0);
  const top = bes16(s, 2);
  const left = bes16(s, 4);
  const bottom = bes16(s, 6);
  const right = bes16(s, 8);
  const extended = (pitch & 0x8000) !== 0 && s.length >= 28;
  const flags = s.length > 22 ? s[22] : 0;
  return {
    rowBytes: pitch & 0x7fff,
    top,
    left,
    bottom,
    right,
    width: right - left,
    height: bottom - top,
    regX: bes16(s, 20) - left,
    regY: bes16(s, 18) - top,
    flags,
    bitDepth: extended ? s[23] : 1,
    clutCastLib: extended ? bes16(s, 24) : 0,
    clutId: extended ? bes16(s, 26) : 1,
    alphaThreshold: s.length > 10 ? s[10] : 0,
    useAlpha: (flags & 0x10) !== 0,
  };
}

/** PackBits: n < 128 -> n + 1 literal bytes; n > 128 -> next byte repeated 257 - n times; 128 = no-op. */
export function unpackBits(src: Uint8Array, outLen: number): Uint8Array {
  const out = new Uint8Array(outLen);
  let i = 0;
  let o = 0;
  while (i < src.length && o < outLen) {
    const n = src[i++];
    if (n < 128) {
      for (let k = 0; k <= n && o < outLen; k++) out[o++] = src[i++] ?? 0;
    } else if (n > 128) {
      const v = src[i++] ?? 0;
      for (let k = 0; k < 257 - n && o < outLen; k++) out[o++] = v;
    }
  }
  return out;
}

/** Row stride the BITD data uses for this depth (rows are padded to 16 bits). */
export function bitdRowBytes(width: number, depth: number): number {
  if (depth === 32) return width * 4;
  if (depth === 16) return width * 2;
  if (depth === 8) return width + (width & 1);
  return Math.ceil((width * depth) / 16) * 2;
}

/** Raw (unpacked) BITD rows: RLE-compressed unless the chunk is exactly rowBytes * height. */
export function bitdRows(bitd: Uint8Array, width: number, height: number, depth: number): { data: Uint8Array; rowBytes: number } {
  const rowBytes = bitdRowBytes(width, depth);
  const size = rowBytes * height;
  const data = bitd.length === size ? bitd : unpackBits(bitd, size);
  return { data, rowBytes };
}

/** Palette indices for 1/2/4/8-bit bitmaps (MSB-first packing). */
export function decodeIndices(bitd: Uint8Array, width: number, height: number, depth: number): Uint8Array {
  const { data, rowBytes } = bitdRows(bitd, width, height, depth);
  const idx = new Uint8Array(width * height);
  const per = 8 / depth;
  const mask = (1 << depth) - 1;
  for (let y = 0; y < height; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const byte = data[row + Math.floor(x / per)];
      idx[y * width + x] = (byte >> (8 - depth * ((x % per) + 1))) & mask;
    }
  }
  return idx;
}

/**
 * 16-bit: compressed rows hold the high bytes of the row then the low bytes; uncompressed data is
 * big-endian words. 0RRRRRGG GGGBBBBB, 5-bit channels widened as (c << 3) | (c >> 2).
 * 32-bit: compressed rows are planar A, R, G, B; uncompressed data is interleaved ARGB.
 */
export function decodeDirect(bitd: Uint8Array, width: number, height: number, depth: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const rowBytes = bitdRowBytes(width, depth);
  const compressed = bitd.length !== rowBytes * height;
  const data = compressed ? unpackBits(bitd, rowBytes * height) : bitd;
  for (let y = 0; y < height; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (depth === 16) {
        const v = compressed ? (data[row + x] << 8) | data[row + width + x] : (data[row + x * 2] << 8) | data[row + x * 2 + 1];
        const r = (v >> 10) & 31;
        const g = (v >> 5) & 31;
        const b = v & 31;
        out[o] = (r << 3) | (r >> 2);
        out[o + 1] = (g << 3) | (g >> 2);
        out[o + 2] = (b << 3) | (b >> 2);
        out[o + 3] = 255;
      } else {
        if (compressed) {
          out[o + 3] = data[row + x];
          out[o] = data[row + width + x];
          out[o + 1] = data[row + width * 2 + x];
          out[o + 2] = data[row + width * 3 + x];
        } else {
          out[o + 3] = data[row + x * 4];
          out[o] = data[row + x * 4 + 1];
          out[o + 1] = data[row + x * 4 + 2];
          out[o + 2] = data[row + x * 4 + 3];
        }
      }
    }
  }
  return out;
}
