// Lingo script metadata: script context (Lctx/LctX), name table (Lnam) and compiled scripts (Lscr).
// Only handler names and declared property names are extracted (the port ships its own Lingo translation).
import { be16, be32 } from './bytes';
import type { DirectorFile } from './rifx';

/** Lctx: entries at u16 @16 (12 bytes each: u32, i32 section, u16, u16); entry count @8; Lnam section @32. */
export type ScriptContext = { sections: number[]; names: string[] };

export function readScriptContext(f: DirectorFile, lctxId: number): ScriptContext | undefined {
  const d = f.chunk(lctxId);
  if (!d || d.length < 36) return undefined;
  const count = be32(d, 8);
  const entriesOffset = be16(d, 16);
  const entrySize = be16(d, 18) || 12;
  const lnamId = be32(d, 32);
  const sections: number[] = [];
  for (let i = 0; i < count; i++) sections.push(be32(d, entriesOffset + i * entrySize + 4));
  return { sections, names: readNames(f.chunk(lnamId)) };
}

/** Lnam: u32, u32, u32 len, u32 len, u16 namesOffset, u16 count, then Pascal strings. */
export function readNames(d: Uint8Array | undefined): string[] {
  if (!d || d.length < 20) return [];
  const off = be16(d, 16);
  const count = be16(d, 18);
  const out: string[] = [];
  let p = off;
  for (let i = 0; i < count && p < d.length; i++) {
    const n = d[p];
    let s = '';
    for (let k = 0; k < n; k++) s += String.fromCharCode(d[p + 1 + k]);
    out.push(s);
    p += 1 + n;
  }
  return out;
}

export type ScriptInfo = { handlers: string[]; properties: string[] };

/**
 * Lscr (big-endian): property name ids (u16) at u32 @62 (count u16 @60); handler records at u32 @74
 * (count u16 @72), each starting with its u16 name id. Records are 42 bytes up to D8 (46 from D8.5 on).
 */
export function readScript(d: Uint8Array, names: string[], directorVersion: number): ScriptInfo {
  const propCount = be16(d, 60);
  const propOff = be32(d, 62);
  const handlerCount = be16(d, 72);
  const handlerOff = be32(d, 74);
  const recSize = directorVersion >= 1700 ? 46 : 42;
  const name = (id: number) => names[id] ?? `name_${id}`;
  const properties: string[] = [];
  for (let i = 0; i < propCount; i++) properties.push(name(be16(d, propOff + i * 2)));
  const handlers: string[] = [];
  for (let i = 0; i < handlerCount; i++) handlers.push(name(be16(d, handlerOff + i * recSize)));
  return { handlers, properties };
}

export const SCRIPT_TYPES: Record<number, string> = { 1: 'score', 3: 'movie', 7: 'parent' };
