// Minimal PE (Windows DLL) resource reader, used to take Director's built-in palettes from the Director
// runtime (Dirapi.dll) that ships in the release zip.

/** Returns the resources of one numeric type (e.g. 10 = RT_RCDATA) as id -> bytes (first language). */
export function readPeResources(d: Uint8Array, type: number): Map<number, Uint8Array> {
  const out = new Map<number, Uint8Array>();
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
  if (d.length < 0x40 || d[0] !== 0x4d || d[1] !== 0x5a) return out;
  const pe = dv.getUint32(0x3c, true);
  if (pe + 24 > d.length || dv.getUint32(pe, true) !== 0x4550) return out;
  const nSections = dv.getUint16(pe + 6, true);
  const optSize = dv.getUint16(pe + 20, true);
  let rsrcVa = -1;
  let rsrcRaw = -1;
  for (let i = 0; i < nSections; i++) {
    const o = pe + 24 + optSize + i * 40;
    let name = '';
    for (let k = 0; k < 8 && d[o + k]; k++) name += String.fromCharCode(d[o + k]);
    if (name === '.rsrc') {
      rsrcVa = dv.getUint32(o + 12, true);
      rsrcRaw = dv.getUint32(o + 20, true);
    }
  }
  if (rsrcVa < 0) return out;
  const dir = (off: number) => {
    const base = rsrcRaw + off;
    const n = dv.getUint16(base + 12, true) + dv.getUint16(base + 14, true);
    const entries: { id: number; named: boolean; ptr: number }[] = [];
    for (let k = 0; k < n; k++) {
      const id = dv.getUint32(base + 16 + k * 8, true);
      const ptr = dv.getUint32(base + 20 + k * 8, true);
      entries.push({ id: id & 0x7fffffff, named: (id & 0x80000000) !== 0, ptr });
    }
    return entries;
  };
  const typeEntry = dir(0).find((e) => !e.named && e.id === type && e.ptr & 0x80000000);
  if (!typeEntry) return out;
  for (const idEntry of dir(typeEntry.ptr & 0x7fffffff)) {
    if (idEntry.named) continue;
    let ptr = idEntry.ptr;
    while (ptr & 0x80000000) {
      const langs = dir(ptr & 0x7fffffff);
      if (!langs.length) break;
      ptr = langs[0].ptr;
    }
    if (ptr & 0x80000000) continue;
    const rva = dv.getUint32(rsrcRaw + ptr, true);
    const size = dv.getUint32(rsrcRaw + ptr + 4, true);
    const fo = rva - rsrcVa + rsrcRaw;
    if (fo >= 0 && fo + size <= d.length) out.set(idEntry.id, d.subarray(fo, fo + size));
  }
  return out;
}
