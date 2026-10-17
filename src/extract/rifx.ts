// Director container files: Afterburner ("FGDM"/"FGDC", the compressed Shockwave form used by .dcr/.cct)
// and plain uncompressed RIFX ("MV93"/"MC95", .dir/.cst/.cxt) movies.
//
// Afterburner layout (big- or little-endian per the RIFX/XFIR header; tags read in that byte order):
//   'RIFX' u32 size 'FGDM'
//   'Fver' varint len, varint version [, varint imapVersion, varint directorVersion [, u8 n, n chars]]
//   'Fcdr' varint len, zlib(compression type table: u16 count, count x 16-byte GUID, count x C strings)
//   'ABMP' varint len, varint compressionType, varint uncompressedLen,
//          zlib(varint, varint, varint resCount, resCount x {varint id, varint offset, varint compSize,
//               varint uncompSize, varint compressionIndex, u32 tag})
//   'FGEI' varint, then the resource bodies. Resource offsets are relative to this point; resource id 2 is the
//          "initial load segment": zlib(sequence of {varint id, uncompSize bytes}) holding small resources inline.
import { inflateSync, unzlibSync } from 'fflate';
import { Reader } from './bytes';

export interface DirectorFile {
  /** true when the container (and the key table, cast arrays and memory map) is little-endian ("XFIR"). */
  littleEndian: boolean;
  codec: string;
  directorVersion: number;
  chunkTag(id: number): string | undefined;
  /** Uncompressed chunk data by resource id. */
  chunk(id: number): Uint8Array | undefined;
  /** All chunk ids carrying `tag`, in id order. */
  idsWithTag(tag: string): number[];
}

const GUID_ZLIB = 'ac99e904-0070-0b36-0000-080007377a34';

function guidString(b: Uint8Array): string {
  // Stored as u32, u16, u16, 8 bytes (the first three fields little-endian in these files, but we only compare
  // against the canonical zlib GUID read the same way).
  const h = (x: number) => x.toString(16).padStart(2, '0');
  const d1 = (b[3] << 24 | b[2] << 16 | b[1] << 8 | b[0]) >>> 0;
  const d2 = b[5] << 8 | b[4];
  const d3 = b[7] << 8 | b[6];
  return `${d1.toString(16).padStart(8, '0')}-${d2.toString(16).padStart(4, '0')}-${d3.toString(16).padStart(4, '0')}-` +
    `${h(b[8])}${h(b[9])}-${h(b[10])}${h(b[11])}${h(b[12])}${h(b[13])}${h(b[14])}${h(b[15])}`;
}

function zlib(d: Uint8Array): Uint8Array {
  try {
    return unzlibSync(d);
  } catch {
    return inflateSync(d.subarray(2));
  }
}

export function openDirectorFile(file: Uint8Array): DirectorFile {
  const head = String.fromCharCode(file[0], file[1], file[2], file[3]);
  if (head !== 'RIFX' && head !== 'XFIR') throw new Error(`not a Director file (${head})`);
  const le = head === 'XFIR';
  const r = new Reader(file, le, 4);
  r.u32();
  const codec = r.fourcc();
  if (codec === 'FGDM' || codec === 'FGDC') return openAfterburner(r, codec);
  return openRifx(r, codec);
}

function openAfterburner(r: Reader, codec: string): DirectorFile {
  const le = r.littleEndian;
  // Fver
  if (r.fourcc() !== 'Fver') throw new Error('Afterburner: missing Fver');
  const fverLen = r.varint();
  const fverStart = r.pos;
  const fverVersion = r.varint();
  let directorVersion = 0;
  if (fverVersion >= 0x401) {
    r.varint();
    directorVersion = r.varint();
  }
  r.pos = fverStart + fverLen;
  // Fcdr: compression types
  if (r.fourcc() !== 'Fcdr') throw new Error('Afterburner: missing Fcdr');
  const fcdrLen = r.varint();
  const fcdr = new Reader(zlib(r.bytes(fcdrLen)), le);
  const typeCount = fcdr.u16();
  const compTypes: string[] = [];
  for (let i = 0; i < typeCount; i++) compTypes.push(guidString(fcdr.bytes(16)));
  // ABMP: resource map
  if (r.fourcc() !== 'ABMP') throw new Error('Afterburner: missing ABMP');
  const abmpLen = r.varint();
  const abmpEnd = r.pos + abmpLen;
  r.varint(); // compression type
  r.varint(); // uncompressed length
  const abmp = new Reader(zlib(r.data.subarray(r.pos, abmpEnd)), le);
  r.pos = abmpEnd;
  abmp.varint();
  abmp.varint();
  const resCount = abmp.varint();
  type Res = { id: number; offset: number; compSize: number; uncompSize: number; comp: number; tag: string };
  const res = new Map<number, Res>();
  for (let i = 0; i < resCount; i++) {
    const id = abmp.varint();
    const offsetRaw = abmp.varint();
    const offset = offsetRaw >= 0x80000000 ? offsetRaw - 0x100000000 : offsetRaw;
    const compSize = abmp.varint();
    const uncompSize = abmp.varint();
    const comp = abmp.varint();
    const tag = abmp.fourcc();
    res.set(id, { id, offset, compSize, uncompSize, comp, tag });
  }
  // FGEI + initial load segment
  if (r.fourcc() !== 'FGEI') throw new Error('Afterburner: missing FGEI');
  r.varint();
  const bodyStart = r.pos;
  const cache = new Map<number, Uint8Array>();
  const ils = res.get(2);
  if (ils) {
    const d = new Reader(zlib(r.data.subarray(bodyStart + ils.offset, bodyStart + ils.offset + ils.compSize)), le);
    while (!d.eof()) {
      const id = d.varint();
      const info = res.get(id);
      if (!info) break;
      cache.set(id, d.bytes(info.uncompSize));
    }
  }
  const byTag = new Map<string, number[]>();
  for (const x of [...res.values()].sort((a, b) => a.id - b.id)) {
    const l = byTag.get(x.tag);
    if (l) l.push(x.id);
    else byTag.set(x.tag, [x.id]);
  }
  return {
    littleEndian: le,
    codec,
    directorVersion,
    chunkTag: (id) => res.get(id)?.tag,
    idsWithTag: (tag) => byTag.get(tag) ?? [],
    chunk(id) {
      const c = cache.get(id);
      if (c) return c;
      const info = res.get(id);
      if (!info || info.offset < 0) return undefined;
      const raw = r.data.subarray(bodyStart + info.offset, bodyStart + info.offset + info.compSize);
      const out = compTypes[info.comp] === GUID_ZLIB && info.compSize !== 0 ? zlib(raw) : raw;
      cache.set(id, out);
      return out;
    },
  };
}

// Uncompressed RIFX movie: 'imap' points at the 'mmap' memory map, whose entries locate every chunk.
function openRifx(r: Reader, codec: string): DirectorFile {
  const le = r.littleEndian;
  const data = r.data;
  if (r.fourcc() !== 'imap') throw new Error('RIFX: missing imap');
  r.u32();
  r.u32();
  const mmapOffset = r.u32();
  r.pos = mmapOffset;
  if (r.fourcc() !== 'mmap') throw new Error('RIFX: missing mmap');
  r.u32();
  const headerLen = r.u16();
  const entryLen = r.u16();
  r.u32(); // max
  const used = r.u32();
  const entriesStart = mmapOffset + 8 + headerLen;
  const entries: { id: number; tag: string; len: number; offset: number }[] = [];
  for (let i = 0; i < used; i++) {
    r.pos = entriesStart + i * entryLen;
    const tag = r.fourcc();
    const len = r.u32();
    const offset = r.u32();
    if (tag === 'free' || tag === 'junk') continue;
    entries.push({ id: i, tag, len, offset });
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byTag = new Map<string, number[]>();
  for (const e of entries) {
    const l = byTag.get(e.tag);
    if (l) l.push(e.id);
    else byTag.set(e.tag, [e.id]);
  }
  let directorVersion = 0;
  const cfgId = byTag.get('VWCF')?.[0] ?? byTag.get('DRCF')?.[0];
  if (cfgId !== undefined) {
    const e = byId.get(cfgId)!;
    const c = data.subarray(e.offset + 8, e.offset + 8 + e.len);
    if (c.length >= 38) directorVersion = (c[36] << 8) | c[37];
  }
  return {
    littleEndian: le,
    codec,
    directorVersion,
    chunkTag: (id) => byId.get(id)?.tag,
    idsWithTag: (tag) => byTag.get(tag) ?? [],
    chunk(id) {
      const e = byId.get(id);
      return e ? data.subarray(e.offset + 8, e.offset + 8 + e.len) : undefined;
    },
  };
}
