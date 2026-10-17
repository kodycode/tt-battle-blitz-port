// IndexedDB cache of the extracted game, so the zip is only needed on the first visit.
// One record under a versioned key: bump CACHE_FORMAT when the record layout changes; the extractor's own
// EXTRACT_VERSION export (if any) is part of the key too, so a changed extractor invalidates old caches.
// Bitmaps are stored as one deflate-compressed blob of all RGBA pixels (~200 MB raw, ~1/10 compressed).
// Works on the main thread and in workers.
import * as extractor from './extractor';
import type { CastJson, ExtractedGame, ExtractedImage } from './types';
import type { ScoreData } from '../runtime/score';

const DB_NAME = 'tt-battle-blitz';
const STORE = 'game';
const CACHE_FORMAT = 1;
const extractVersion = String((extractor as Record<string, unknown>).EXTRACT_VERSION ?? 0);
export const CACHE_KEY = `game-f${CACHE_FORMAT}-x${extractVersion}`;

type CachedRecord = {
  key: string;
  zipSha1: string;
  savedAt: number;
  casts: CastJson;
  score: ScoreData;
  sounds: Map<string, Uint8Array>;
  jpegs: Map<string, Uint8Array>;
  imageIndex: [url: string, width: number, height: number, offset: number][];
  imageBytes: number;
  imagePixels: Blob; // deflate(concatenated RGBA)
};

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  const r = indexedDB.open(DB_NAME, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  return req(r);
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

const streamToBytes = async (s: ReadableStream<Uint8Array>) => new Uint8Array(await new Response(s).arrayBuffer());

// All bitmaps in one buffer; the returned game's images are views into it (one transferable for postMessage).
export function packImages(game: ExtractedGame): { game: ExtractedGame; pixels: Uint8Array; index: CachedRecord['imageIndex'] } {
  let total = 0;
  for (const im of game.images.values()) total += im.rgba.length;
  const pixels = new Uint8Array(total);
  const index: CachedRecord['imageIndex'] = [];
  const images = new Map<string, ExtractedImage>();
  let at = 0;
  for (const [url, im] of game.images) {
    pixels.set(im.rgba, at);
    index.push([url, im.width, im.height, at]);
    images.set(url, { width: im.width, height: im.height, rgba: new Uint8ClampedArray(pixels.buffer, at, im.rgba.length) });
    at += im.rgba.length;
  }
  return { game: { ...game, images }, pixels, index };
}

function unpackImages(pixels: Uint8Array, index: CachedRecord['imageIndex']): Map<string, ExtractedImage> {
  const images = new Map<string, ExtractedImage>();
  for (const [url, width, height, offset] of index)
    images.set(url, { width, height, rgba: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset + offset, width * height * 4) });
  return images;
}

// Stores a packed game (packImages) as the current cache entry and drops any other entries.
export async function saveGame(packed: ReturnType<typeof packImages>, zipSha1: string): Promise<void> {
  const compressed = new Blob([packed.pixels]).stream().pipeThrough(new CompressionStream('deflate'));
  const imagePixels = await new Response(compressed).blob();
  const { game } = packed;
  const record: CachedRecord = {
    key: CACHE_KEY,
    zipSha1,
    savedAt: Date.now(),
    casts: game.casts,
    score: game.score,
    sounds: game.sounds,
    jpegs: game.jpegs ?? new Map(),
    imageIndex: packed.index,
    imageBytes: packed.pixels.length,
    imagePixels,
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    store.put(record, CACHE_KEY);
    await done(tx);
  } finally {
    db.close();
  }
}

// The cached game for the current key, or null.
export async function loadGame(): Promise<ExtractedGame | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  let rec: CachedRecord | undefined;
  try {
    rec = await req(db.transaction(STORE, 'readonly').objectStore(STORE).get(CACHE_KEY));
  } finally {
    db.close();
  }
  if (!rec) return null;
  const pixels = await streamToBytes(rec.imagePixels.stream().pipeThrough(new DecompressionStream('deflate')));
  if (pixels.length !== rec.imageBytes) throw new Error('cached game data is damaged');
  return { casts: rec.casts, score: rec.score, sounds: rec.sounds, jpegs: rec.jpegs, images: unpackImages(pixels, rec.imageIndex) };
}

// True if any game data is stored (including entries from an older extractor version).
export async function hasStoredData(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    const db = await openDb();
    try {
      return (await req(db.transaction(STORE, 'readonly').objectStore(STORE).count())) > 0;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

export async function clearStoredData(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => resolve();
  });
}
