// Movie-level tables: key table (KEY*), cast list (MCsL), cast member arrays (CAS*), CASt member headers,
// and the movie config (VWCF/DRCF).
import { Reader, be16, bes16, be32, decodeText } from './bytes';
import type { DirectorFile } from './rifx';

export type KeyEntry = { section: number; owner: number; tag: string };

/** KEY*: u16 headerSize, u16 entrySize, u32 capacity, u32 used, then {u32 section, u32 owner, fourcc}. */
export function readKeyTable(f: DirectorFile): KeyEntry[] {
  const id = f.idsWithTag('KEY*')[0];
  const d = id === undefined ? undefined : f.chunk(id);
  if (!d) return [];
  const r = new Reader(d, f.littleEndian);
  r.u16();
  r.u16();
  r.u32();
  const used = r.u32();
  const out: KeyEntry[] = [];
  for (let i = 0; i < used; i++) out.push({ section: r.u32(), owner: r.u32(), tag: r.fourcc() });
  return out;
}

export class KeyTable {
  private byOwner = new Map<number, KeyEntry[]>();
  constructor(readonly entries: KeyEntry[]) {
    for (const e of entries) {
      const l = this.byOwner.get(e.owner);
      if (l) l.push(e);
      else this.byOwner.set(e.owner, [e]);
    }
  }
  /** Sections owned by `owner` (a CASt chunk id, or an MCsL cast id), optionally filtered by tag. */
  owned(owner: number, tag?: string): number[] {
    return (this.byOwner.get(owner) ?? []).filter((e) => !tag || e.tag === tag).map((e) => e.section);
  }
  ownerOf(section: number): number | undefined {
    return this.entries.find((e) => e.section === section)?.owner;
  }
}

/**
 * Generic Director "list" structure used by MCsL and CASt info: at `dataOffset`, u16 count, (count + 1)? u32 offsets,
 * u32 itemsLength, items. Returns the item byte ranges.
 */
export function readOffsetList(d: Uint8Array, dataOffset: number): Uint8Array[] {
  if (dataOffset + 2 > d.length) return [];
  const count = be16(d, dataOffset);
  const offs: number[] = [];
  for (let i = 0; i < count; i++) offs.push(be32(d, dataOffset + 2 + i * 4));
  const itemsLen = be32(d, dataOffset + 2 + count * 4);
  const base = dataOffset + 2 + count * 4 + 4;
  const items: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    const end = i + 1 < count ? offs[i + 1] : itemsLen;
    items.push(d.subarray(base + offs[i], base + Math.max(offs[i], end)));
  }
  return items;
}

const pascal = (b: Uint8Array | undefined): Uint8Array => (b && b.length ? b.subarray(1, 1 + b[0]) : new Uint8Array(0));

export type CastListEntry = { name: string; path: string; preload: number; minMember: number; maxMember: number; id: number };

/** MCsL: u32 dataOffset, u16, u16 castCount, u16 itemsPerCast, u16; list items per cast: name, path, preload, (min, max, id). */
export function readCastList(f: DirectorFile): CastListEntry[] {
  const id = f.idsWithTag('MCsL')[0];
  const d = id === undefined ? undefined : f.chunk(id);
  if (!d) return [];
  const dataOffset = be32(d, 0);
  const castCount = be16(d, 6);
  const per = be16(d, 8);
  const items = readOffsetList(d, dataOffset);
  const out: CastListEntry[] = [];
  for (let i = 0; i < castCount; i++) {
    const it = (k: number) => items[i * per + k];
    const ids = it(4);
    out.push({
      name: decodeText(pascal(it(1))),
      path: decodeText(pascal(it(2))),
      preload: it(3) && it(3).length >= 2 ? be16(it(3), 0) : 0,
      minMember: ids && ids.length >= 2 ? be16(ids, 0) : 0,
      maxMember: ids && ids.length >= 4 ? be16(ids, 2) : 0,
      id: ids && ids.length >= 8 ? be32(ids, 4) : 0,
    });
  }
  return out;
}

/** CAS*: big-endian u32 CASt section ids, slot k = member minMember + k (0 = empty slot). */
export function readCastArray(d: Uint8Array): number[] {
  const out: number[] = [];
  for (let o = 0; o + 4 <= d.length; o += 4) out.push(be32(d, o));
  return out;
}

export type CastMember = {
  chunkId: number;
  type: number;
  info: Uint8Array;
  specific: Uint8Array;
  /** Decoded info list items (item 0 script text, 1 name, ...). */
  infoItems: Uint8Array[];
  name: string;
  /** Info header flags (u32 at +12 of the info block). */
  flags: number;
  /** Lctx script number (u32 at +16 of the info block), 0 = none. */
  scriptId: number;
};

/** CASt (D5+): u32 type, u32 infoLen, u32 specificLen, info, specific. */
export function readCastMember(chunkId: number, d: Uint8Array): CastMember {
  const type = be32(d, 0);
  const infoLen = be32(d, 4) >>> 0;
  const specLen = be32(d, 8) >>> 0;
  const info = d.subarray(12, 12 + infoLen);
  const specific = d.subarray(12 + infoLen, 12 + infoLen + specLen);
  let infoItems: Uint8Array[] = [];
  let flags = 0;
  let scriptId = 0;
  if (info.length >= 20) {
    flags = be32(info, 12);
    scriptId = be32(info, 16);
    infoItems = readOffsetList(info, be32(info, 0));
  }
  return { chunkId, type, info, specific, infoItems, name: decodeText(pascal(infoItems[1])), flags, scriptId };
}

export const MEMBER_TYPES: Record<number, string> = {
  1: 'bitmap',
  2: 'filmloop',
  3: 'field',
  4: 'palette',
  5: 'picture',
  6: 'sound',
  7: 'button',
  8: 'shape',
  9: 'movie',
  10: 'digitalvideo',
  11: 'script',
  12: 'richtext',
  14: 'transition',
  15: 'xtra',
  16: 'font',
};

/** Xtra members: specific data = u32 length + xtra type name ("text" for the D8 text xtra). */
export function xtraName(m: CastMember): string {
  const s = m.specific;
  if (s.length < 4) return '';
  const n = be32(s, 0);
  return decodeText(s.subarray(4, 4 + n)).replace(/\0+$/, '');
}

export function memberTypeName(m: CastMember): string {
  if (m.type === 15) return xtraName(m).toLowerCase() === 'text' ? 'text' : 'xtra';
  return MEMBER_TYPES[m.type] ?? 'unknown';
}

export type MovieConfig = {
  stageTop: number;
  stageLeft: number;
  stageBottom: number;
  stageRight: number;
  minMember: number;
  maxMember: number;
  tempo: number;
  directorVersion: number;
  stageColor: number;
};

/** VWCF/DRCF (big-endian): rect at +4, min/max member at +12, D7+ stage colour bytes, version at +36, tempo at +54. */
export function readConfig(f: DirectorFile): MovieConfig | undefined {
  const id = f.idsWithTag('DRCF')[0] ?? f.idsWithTag('VWCF')[0];
  const d = id === undefined ? undefined : f.chunk(id);
  if (!d || d.length < 56) return undefined;
  const directorVersion = be16(d, 36);
  // D7+: stage colour = R at +18, G at +19, B at +27 when the "is RGB" byte (+26) is set; else palette index at +26.
  const isRgb = d[26] !== 0;
  const stageColor = isRgb ? (d[18] << 16) | (d[19] << 8) | d[27] : 0;
  return {
    stageTop: bes16(d, 4),
    stageLeft: bes16(d, 6),
    stageBottom: bes16(d, 8),
    stageRight: bes16(d, 10),
    minMember: bes16(d, 12),
    maxMember: bes16(d, 14),
    tempo: bes16(d, 54),
    directorVersion,
    stageColor,
  };
}
