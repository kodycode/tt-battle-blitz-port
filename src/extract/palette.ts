// Palettes: CLUT chunks of palette members and Director's built-in palettes.

/** 16-bit colour component -> 8 bit, rounded (v * 255 / 65535). */
const c16 = (d: Uint8Array, o: number) => Math.round((((d[o] << 8) | d[o + 1]) * 255) / 65535);

/** CLUT: 6 bytes per entry, 16-bit big-endian R, G, B. */
export function readClut(d: Uint8Array): number[] {
  const out: number[] = [];
  for (let o = 0; o + 6 <= d.length; o += 6) out.push((c16(d, o) << 16) | (c16(d, o + 2) << 8) | c16(d, o + 4));
  return out;
}

/**
 * Built-in palette ids (score palette channel member / bitmap clutId - 1). -8 (web216) is deliberately left
 * unnamed: the data spells it "id-8".
 */
const BUILTIN_NAMES: Record<number, string> = {
  [-1]: 'systemMac',
  [-2]: 'rainbow',
  [-3]: 'grayscale',
  [-4]: 'pastels',
  [-5]: 'vivid',
  [-6]: 'ntsc',
  [-7]: 'metallic',
  [-102]: 'systemWin',
};

export function builtInPaletteName(id: number): string | undefined {
  return BUILTIN_NAMES[id];
}

/**
 * The Macintosh 8-bit system palette: a 6x6x6 colour cube (each channel FF, CC, 99, 66, 33, 00, white first),
 * then ten-step ramps (EE DD BB AA 88 77 55 44 22 11) of red, green, blue and grey, then black.
 */
export function systemMacPalette(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 215; i++) {
    const r = 5 - Math.floor(i / 36);
    const g = 5 - (Math.floor(i / 6) % 6);
    const b = 5 - (i % 6);
    out.push(((r * 0x33) << 16) | ((g * 0x33) << 8) | (b * 0x33));
  }
  const ramp = [0xee, 0xdd, 0xbb, 0xaa, 0x88, 0x77, 0x55, 0x44, 0x22, 0x11];
  for (const v of ramp) out.push(v << 16);
  for (const v of ramp) out.push(v << 8);
  for (const v of ramp) out.push(v);
  for (const v of ramp) out.push((v << 16) | (v << 8) | v);
  out.push(0);
  return out;
}

let macCache: number[] | undefined;
export function systemMac(): number[] {
  return (macCache ??= systemMacPalette());
}

/** Grayscale: index 0 white down to index 255 black. */
export function grayscalePalette(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 256; i++) {
    const v = 255 - i;
    out.push((v << 16) | (v << 8) | v);
  }
  return out;
}

/**
 * Director's palette resources (RT_RCDATA in Dirapi.dll): 4-byte records {u8 red, u8 index, u8 blue, u8 green}
 * with increasing indices from 0 to 255; entries between two records are linear interpolations of them.
 */
export function decodePaletteResource(d: Uint8Array): number[] | undefined {
  const recs: { i: number; c: [number, number, number] }[] = [];
  for (let o = 0; o + 4 <= d.length; o += 4) {
    const i = d[o + 1];
    if (recs.length && i <= recs[recs.length - 1].i) break;
    recs.push({ i, c: [d[o], d[o + 3], d[o + 2]] });
    if (i === 255) break;
  }
  if (!recs.length || recs[0].i !== 0 || recs[recs.length - 1].i !== 255) return undefined;
  const out = new Array<number>(256).fill(0);
  out[0] = (recs[0].c[0] << 16) | (recs[0].c[1] << 8) | recs[0].c[2];
  for (let k = 1; k < recs.length; k++) {
    const a = recs[k - 1];
    const b = recs[k];
    const n = b.i - a.i;
    for (let j = 1; j <= n; j++) {
      const ch = (x: number) => Math.round(a.c[x] + ((b.c[x] - a.c[x]) * j) / n);
      out[a.i + j] = (ch(0) << 16) | (ch(1) << 8) | ch(2);
    }
  }
  return out;
}

/** Built-in palette id -> Dirapi.dll RT_RCDATA resource id. */
const PALETTE_RESOURCES: Record<number, number> = {
  [-1]: 41, // systemMac
  [-2]: 42, // rainbow
  [-3]: 43, // grayscale
  [-4]: 44, // pastels
  [-5]: 45, // vivid
  [-6]: 46, // NTSC
  [-7]: 47, // metallic
  [-101]: 142, // systemWinDir4
  [-102]: 141, // systemWin
};

/**
 * Built-in palettes, decoded from the Director runtime's resources when Dirapi.dll is available. Ids without a
 * table here (notably -8, web216) decode with systemMac.
 * Without Dirapi.dll only systemMac and grayscale (both generated) are exact.
 */
export class BuiltInPalettes {
  private cache = new Map<number, number[]>();
  readonly missing = new Set<number>();
  constructor(private resources?: Map<number, Uint8Array>) {}
  get(id: number): number[] {
    let p = this.cache.get(id);
    if (p) return p;
    const res = PALETTE_RESOURCES[id];
    const data = res !== undefined ? this.resources?.get(res) : undefined;
    p = data ? decodePaletteResource(data) : undefined;
    if (!p) {
      if (id === -3) p = grayscalePalette();
      else {
        if (id !== -1 && res !== undefined) this.missing.add(id);
        p = systemMac();
      }
    }
    this.cache.set(id, p);
    return p;
  }
}
