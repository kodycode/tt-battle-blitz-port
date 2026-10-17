// Bring-your-own-data extractor: original release zip -> casts.json / score.json values, bitmaps (RGBA),
// sounds (MP3) and JPEG streams. Pure TypeScript (Uint8Array/DataView), runs in browsers and Node.
// Interface: docs/EXTRACTION.md. Internals: docs/EXTRACTOR.md. Output formats: docs/DATA_FORMAT.md.
import { hexColor, sanitize } from './bytes';
import { readZipEntries } from './zip';
import { openDirectorFile, type DirectorFile } from './rifx';
import {
  KeyTable,
  memberTypeName,
  readCastArray,
  readCastList,
  readCastMember,
  readConfig,
  readKeyTable,
  type CastMember,
} from './cast';
import { readScript, readScriptContext, SCRIPT_TYPES, type ScriptContext } from './script';
import { readBitmapInfo, unpackBits } from './bitmap';
import { decodeBitmap, jpegSize, type ResolvedPalette } from './image';
import { BuiltInPalettes, builtInPaletteName, readClut } from './palette';
import { readPeResources } from './pe';
import { extractSound, parseCues } from './sound';
import { fieldJson, readFontMap, textXtraJson } from './text';
import { decodeScore, readLabels, readScoreEntries } from './score';
import type { Json } from './lingo';
export { stringifyData } from './json';

/** Bumped whenever the extractor's output changes (part of the first-run cache key, src/data/extractor.ts). */
export const EXTRACT_VERSION = '2';

export type ExtractedImage = { width: number; height: number; rgba: Uint8ClampedArray };
export type CastJson = { format: string; castLibs: any[] };
export type ScoreJson = { [k: string]: any };
export type ExtractedGame = {
  casts: CastJson;
  score: ScoreJson;
  /** key = bitmap member `url` (PNG members) or `alphaUrl` (JPEG alpha masks). */
  images: Map<string, ExtractedImage>;
  /** key = sound member `url` (MP3 bytes). */
  sounds: Map<string, Uint8Array>;
  /** key = bitmap member `url` for JPEG members (`format: "jpeg"`), the JPEG stream exactly as stored. */
  jpegs: Map<string, Uint8Array>;
  /** Non-fatal notes (unresolved palettes, unparsed initializers, ...). */
  warnings: string[];
};

type Lib = {
  number: number;
  name: string;
  external: boolean;
  fileName: string | null;
  authoredPath: string;
  file?: DirectorFile;
  keys?: KeyTable;
  castId?: number; // CAS* chunk id
  minMember: number;
  members: Member[];
  ctx?: ScriptContext;
  fonts: Map<number, string>;
};
type Member = { lib: Lib; number: number; m: CastMember; name: string; type: string };

type Progress = (done: number, total: number, stage: string) => void;

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function extractGame(zip: Uint8Array, onProgress?: Progress): Promise<ExtractedGame> {
  const report = onProgress ?? (() => {});
  report(0, 1, 'unzip');
  // game.dcr + external casts, and the Director runtime (Dirapi.dll) for its built-in palette tables.
  const entries = readZipEntries(zip, (b) => /^game\.dcr$/i.test(b) || /^char_.*\.cct$/i.test(b) || /^dirapi\.dll$/i.test(b));
  const byLower = new Map([...entries].map(([k, v]) => [k.toLowerCase(), v]));
  const gameData = byLower.get('game.dcr');
  if (!gameData) throw new Error('game.dcr not found in the zip');
  await tick();
  return extractFromFiles(gameData, (name) => byLower.get(name.toLowerCase()), report, byLower.get('dirapi.dll'));
}

/** Same as extractGame, for callers that already have the movie files (name -> bytes lookup for external casts). */
export async function extractFromFiles(
  gameData: Uint8Array,
  externalFile: (fileName: string) => Uint8Array | undefined,
  report: Progress = () => {},
  dirapi?: Uint8Array,
): Promise<ExtractedGame> {
  const warnings: string[] = [];
  const builtIns = new BuiltInPalettes(dirapi ? readPeResources(dirapi, 10) : undefined);
  const game = openDirectorFile(gameData);
  const gameKeys = new KeyTable(readKeyTable(game));
  const cfg = readConfig(game);
  if (!cfg) throw new Error('game.dcr: missing movie config');
  const castList = readCastList(game);

  // Cast libraries: internal casts map to CAS* chunks through the key table (owner == MCsL cast id).
  const castByOwner = new Map<number, number>();
  for (const e of gameKeys.entries) if (e.tag === 'CAS*') castByOwner.set(e.owner, e.section);

  const libs: Lib[] = [];
  castList.forEach((e, idx) => {
    const lib: Lib = {
      number: idx + 1,
      name: e.name,
      external: e.path !== '',
      fileName: null,
      authoredPath: e.path,
      minMember: 1,
      members: [],
      fonts: new Map(),
    };
    if (!lib.external) {
      lib.file = game;
      lib.keys = gameKeys;
      lib.minMember = e.minMember > 0 ? e.minMember : 1;
      lib.castId = castByOwner.get(e.id);
    } else {
      // The game points castLib(n).fileName at "<name>.cct" at runtime.
      lib.fileName = e.name + '.cct';
      const data = externalFile(lib.fileName);
      if (data) {
        const f = openDirectorFile(data);
        lib.file = f;
        lib.keys = new KeyTable(readKeyTable(f));
        lib.castId = f.idsWithTag('CAS*')[0];
        const ecl = readCastList(f);
        const ecfg = readConfig(f);
        if (ecl.length && ecl[0].minMember > 0) lib.minMember = ecl[0].minMember;
        else if (ecfg && ecfg.minMember > 0) lib.minMember = ecfg.minMember;
      }
    }
    if (lib.file && lib.castId !== undefined && lib.keys) {
      const f = lib.file;
      const owner = lib.keys.ownerOf(lib.castId);
      // Script context: each cast owns its own Lctx (key table), e.g. cartoon_network_enhancements' scripts
      // are Lscr chunks of its own Lctx, not of the Lingo cast's.
      const lctx = owner === undefined ? undefined : [...lib.keys.owned(owner, 'Lctx'), ...lib.keys.owned(owner, 'LctX')][0];
      if (lctx !== undefined) lib.ctx = readScriptContext(f, lctx);
      if (owner !== undefined) {
        const fmap = lib.keys.owned(owner, 'Fmap')[0];
        if (fmap !== undefined) lib.fonts = readFontMap(f.chunk(fmap));
      }
      const ids = readCastArray(f.chunk(lib.castId) ?? new Uint8Array(0));
      ids.forEach((id, k) => {
        if (id <= 0 || f.chunkTag(id) !== 'CASt') return;
        const d = f.chunk(id);
        if (!d) return;
        const m = readCastMember(id, d);
        lib.members.push({ lib, number: lib.minMember + k, m, name: m.name, type: memberTypeName(m) });
      });
    }
    libs.push(lib);
  });

  // Member lookup in (castLib, member) order.
  const members = new Map<string, Member>();
  const ordered: Member[] = [];
  for (const lib of libs) for (const r of lib.members) ordered.push(r);
  ordered.sort((a, b) => a.lib.number - b.lib.number || a.number - b.number);
  for (const r of ordered) members.set(`${r.lib.number}:${r.number}`, r);
  const nameOf = (lib: number, mem: number): string | null => members.get(`${lib}:${mem}`)?.name ?? null;
  const linked = (r: Member, tag: string): Uint8Array | undefined => {
    const id = r.lib.keys?.owned(r.m.chunkId, tag)[0];
    return id === undefined ? undefined : r.lib.file!.chunk(id);
  };
  const paletteColors = new Map<string, number[] | null>();
  const paletteOf = (lib: number, mem: number): number[] | null => {
    const key = `${lib}:${mem}`;
    if (paletteColors.has(key)) return paletteColors.get(key)!;
    const r = members.get(key);
    let cols: number[] | null = null;
    if (r && r.type === 'palette') {
      const clut = linked(r, 'CLUT');
      if (clut) cols = readClut(clut);
    }
    paletteColors.set(key, cols);
    return cols;
  };

  const images = new Map<string, ExtractedImage>();
  const sounds = new Map<string, Uint8Array>();
  const jpegs = new Map<string, Uint8Array>();
  const total = ordered.length + 1;
  let done = 0;

  const castLibsJson: Json[] = [];
  for (const lib of libs) {
    const ms: Json[] = [];
    for (const r of lib.members) {
      ms.push(memberJson(r));
      if (++done % 50 === 0) {
        report(done, total, 'casts');
        await tick();
      }
    }
    const lj: { [k: string]: Json } = { number: lib.number, name: lib.name, external: lib.external, fileName: lib.fileName };
    if (lib.external) lj.authoredPath = lib.authoredPath;
    lj.loaded = lib.castId !== undefined && !!lib.file;
    lj.minMember = lib.minMember;
    lj.memberCount = lib.members.length;
    lj.members = ms;
    castLibsJson.push(lj);
  }

  function memberJson(r: Member): Json {
    const { m, lib } = r;
    const j: { [k: string]: Json } = { number: r.number, name: r.name, type: r.type, chunkId: m.chunkId };
    const relDir = `assets/${sanitize(lib.name)}/`;
    const stem = `${r.number}_${sanitize(r.name)}`;
    switch (r.type) {
      case 'bitmap':
        bitmapJson(r, j, relDir + stem);
        break;
      case 'sound': {
        j.loop = (m.flags & 0x10) === 0;
        const snd = linked(r, 'snd ');
        if (!snd) {
          j.url = null;
          warnings.push(`${lib.name}#${r.number} ${r.name}: no snd chunk`);
          break;
        }
        try {
          const s = extractSound(snd);
          const url = relDir + stem + '.mp3';
          j.url = url;
          sounds.set(url, s.mp3);
          j.sampleRate = s.sampleRate;
          j.sampleCount = s.sampleCount;
          j.skipSamples = s.skipSamples;
          j.mpegSamples = s.mpegSamples;
          const cupt = linked(r, 'cupt');
          if (cupt) {
            const cues = parseCues(cupt);
            if (cues.length) j.cuePoints = cues;
          }
        } catch (e) {
          j.url = null;
          warnings.push(`${lib.name}#${r.number} ${r.name}: ${(e as Error).message}`);
        }
        break;
      }
      case 'field':
      case 'button':
        Object.assign(j, fieldJson(m.specific, linked(r, 'STXT'), lib.fonts, r.type === 'button'));
        break;
      case 'text':
        Object.assign(j, textXtraJson(m.specific, linked(r, 'XMED')));
        break;
      case 'script': {
        j.scriptType = SCRIPT_TYPES[m.specific.length >= 2 ? (m.specific[0] << 8) | m.specific[1] : 0] ?? 'unknown';
        const sec = lib.ctx && m.scriptId > 0 ? lib.ctx.sections[m.scriptId - 1] : undefined;
        const d = sec !== undefined && sec > 0 ? lib.file!.chunk(sec) : undefined;
        if (d && lib.ctx) {
          const s = readScript(d, lib.ctx.names, lib.file!.directorVersion);
          j.handlers = s.handlers;
          j.properties = s.properties;
        }
        break;
      }
      case 'shape': {
        // u16 shapeType, i16 rect top/left/bottom/right, u16 pattern, u8 fore, u8 back, u8 fillType, u8 lineSize
        const s = m.specific;
        const dv = new DataView(s.buffer, s.byteOffset, s.byteLength);
        j.shapeType = dv.getUint16(0);
        j.width = dv.getInt16(8) - dv.getInt16(4);
        j.height = dv.getInt16(6) - dv.getInt16(2);
        j.regX = 0;
        j.regY = 0;
        j.color = s[12];
        j.backColor = s[13];
        j.fillType = s[14];
        j.lineThickness = s[15];
        break;
      }
      case 'palette': {
        const clut = linked(r, 'CLUT');
        if (clut) j.colors = readClut(clut).map(hexColor);
        break;
      }
      case 'filmloop':
        filmLoopJson(r, j);
        break;
    }
    return j;
  }

  function bitmapJson(r: Member, j: { [k: string]: Json }, stemPath: string) {
    const { m, lib } = r;
    const bi = readBitmapInfo(m.specific);
    j.width = bi.width;
    j.height = bi.height;
    j.regX = bi.regX;
    j.regY = bi.regY;
    j.bitDepth = bi.bitDepth;
    // Palette: clutId > 0 = palette member number (clutCastLib -1 = own cast, > 0 = that cast, 0 = stale:
    // own cast if it has a palette there, else the first cast that does); clutId <= 0 = built-in (id = clutId - 1).
    const rawClut = bi.clutId;
    const pal: { [k: string]: Json } = {};
    let resolved: ResolvedPalette | undefined;
    if (rawClut > 0) {
      let palLib = bi.clutCastLib > 0 ? bi.clutCastLib : lib.number;
      let how = bi.clutCastLib > 0 ? 'castLib' : 'ownCast';
      let cols = paletteOf(palLib, rawClut);
      if (!cols) {
        for (const o of ordered) {
          if (o.number !== rawClut) continue;
          const c = paletteOf(o.lib.number, rawClut);
          if (c) {
            cols = c;
            palLib = o.lib.number;
            how = 'search';
            break;
          }
        }
      }
      if (cols) resolved = { kind: 'cast', colors: cols };
      else if (bi.bitDepth > 1) warnings.push(`palette unresolved: ${lib.name}#${r.number} ${r.name}`);
      pal.castLib = palLib;
      pal.member = rawClut;
      pal.name = nameOf(palLib, rawClut);
      if (bi.clutCastLib <= 0) pal.castLibRaw = bi.clutCastLib;
      if (how === 'search') pal.resolvedBy = 'search';
    } else {
      const id = rawClut - 1;
      resolved = { kind: 'system', id };
      pal.system = builtInPaletteName(id) ?? `id${id}`;
    }
    if (bi.bitDepth <= 8) j.palette = pal;
    if (bi.bitDepth === 32) {
      j.useAlpha = bi.useAlpha;
      j.alphaThreshold = bi.alphaThreshold;
    }
    const bitd = linked(r, 'BITD');
    if (bitd && bi.width > 0 && bi.height > 0) {
      const img = decodeBitmap(bitd, bi, resolved, builtIns);
      if (img.index0Color !== undefined) j.index0Color = hexColor(img.index0Color);
      if (img.whitePixelsNotIndex0) j.whitePixelsNotIndex0 = img.whitePixelsNotIndex0;
      let alpha = false;
      for (let k = 3; k < img.rgba.length; k += 4) if (img.rgba[k] !== 255) {
        alpha = true;
        break;
      }
      j.hasAlpha = alpha;
      const url = stemPath + '.png';
      j.url = url;
      images.set(url, { width: bi.width, height: bi.height, rgba: img.rgba });
      return;
    }
    const jpeg = linked(r, 'ediM');
    if (jpeg && jpeg.length > 4 && jpeg[0] === 0xff && jpeg[1] === 0xd8) {
      const sz = jpegSize(jpeg);
      if (sz && sz.width === bi.width && sz.height === bi.height) {
        const url = stemPath + '.jpg';
        jpegs.set(url, jpeg.slice());
        j.url = url;
        j.format = 'jpeg';
        let alphaUrl: string | null = null;
        const alfa = linked(r, 'ALFA');
        if (alfa && alfa.length) {
          const npx = bi.width * bi.height;
          const a = unpackBits(alfa, npx);
          const opaque = a.every((v) => v === 255);
          j.alphaOpaque = opaque;
          if (!opaque) {
            const rgba = new Uint8ClampedArray(npx * 4).fill(255);
            for (let k = 0; k < npx; k++) rgba[k * 4 + 3] = a[k];
            alphaUrl = stemPath + '_alpha.png';
            images.set(alphaUrl, { width: bi.width, height: bi.height, rgba });
          }
        }
        j.alphaUrl = alphaUrl;
        return;
      }
    }
    if (bi.width <= 0 || bi.height <= 0) {
      j.url = null;
      j.empty = true;
    } else {
      warnings.push(`bitmap without pixel data: ${lib.name}#${r.number} ${r.name}`);
      j.url = null;
    }
  }

  function filmLoopJson(r: Member, j: { [k: string]: Json }) {
    // Specific data: i16 rect top/left/bottom/right, u32 flags (0x01 center, 0x02 = no crop, 0x08 sound,
    // 0x20 = no looping).
    const s = r.m.specific;
    const dv = new DataView(s.buffer, s.byteOffset, s.byteLength);
    const top = dv.getInt16(0);
    const left = dv.getInt16(2);
    const bottom = dv.getInt16(4);
    const right = dv.getInt16(6);
    const flags = s.length >= 12 ? dv.getUint32(8) : 0;
    const w = right - left;
    const h = bottom - top;
    j.width = w;
    j.height = h;
    j.regX = Math.trunc(w / 2);
    j.regY = Math.trunc(h / 2);
    const fl: { [k: string]: Json } = {
      rect: [left, top, right, bottom],
      center: (flags & 0x01) !== 0,
      crop: (flags & 0x02) === 0,
      sound: (flags & 0x08) !== 0,
      loops: (flags & 0x20) === 0,
    };
    const vwsc = linked(r, 'VWSC') ?? linked(r, 'SCVW');
    if (vwsc) {
      const fr = decodeScore(readScoreEntries(vwsc), nameOf, r.lib.number);
      fl.frameCount = fr.frameCount;
      fl.sprites = fr.sprites;
      if (fr.frameScripts.length) fl.frameScripts = fr.frameScripts;
      if (fr.nonEmptyOtherMain) fl.otherMainChannelsRaw = fr.otherMain;
      for (const t of fr.initFailed) warnings.push(`unparsed initializer: ${t}`);
    }
    j.filmLoop = fl;
  }

  // ---- score
  report(done, total, 'score');
  await tick();
  const vwscId = gameKeys.owned(1024, 'VWSC')[0] ?? game.idsWithTag('VWSC')[0];
  const res = decodeScore(readScoreEntries(game.chunk(vwscId)!), nameOf);
  for (const t of res.initFailed) warnings.push(`unparsed initializer: ${t}`);
  const labels: { [k: string]: Json } = {};
  const labelList: Json[] = [];
  const vwlbId = gameKeys.owned(1024, 'VWLB')[0] ?? game.idsWithTag('VWLB')[0];
  for (const l of readLabels(vwlbId === undefined ? undefined : game.chunk(vwlbId))) {
    labels[l.name] = l.frame;
    labelList.push({ frame: l.frame, name: l.name });
  }
  const score: ScoreJson = {
    format: 'tt-score/1',
    stage: {
      width: cfg.stageRight - cfg.stageLeft,
      height: cfg.stageBottom - cfg.stageTop,
      left: cfg.stageLeft,
      top: cfg.stageTop,
      bgColor: hexColor(cfg.stageColor),
    },
    tempo: {
      configTempo: cfg.tempo,
      note: 'puppetTempo(999) in Global_Main; Class_Globals.FRAME_RATE = 30 throttles the game loop. Score tempo channel is empty.',
    },
    frameCount: res.frameCount,
    decodedFrames: res.decodedFrames,
    framesVersion: res.framesVersion,
    spriteRecordSize: res.recSize,
    spriteChannelCount: res.numChannels - res.mainChannels,
    maxSpriteChannelUsed: res.maxChannelUsed,
    labels,
    labelList,
    frameScripts: res.frameScripts,
    palettes: res.paletteRuns,
    tempoChannel: [],
    sound1: [],
    sound2: [],
    transitions: [],
    otherMainChannelsRaw: res.otherMain,
    sprites: res.sprites,
  };
  for (const id of builtIns.missing) warnings.push(`built-in palette ${id} not available (no Dirapi.dll): decoded with systemMac`);
  report(total, total, 'done');
  return { casts: { format: 'tt-casts/1', castLibs: castLibsJson }, score, images, sounds, jpegs, warnings };
}

