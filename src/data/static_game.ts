// The static files under public, read into an ExtractedGame (PNGs decoded to RGBA, MP3/JPEG bytes kept).
// Used by the ?mem=1 test mode to run the in-memory data path on known data (it must render pixel-identically
// to the static path), and as a stand-in extractor while developing without the real one.
import { decodePng } from './png';
import type { CastJson, ExtractedGame, ProgressFn } from './types';

export async function loadStaticAsExtracted(base = '', onProgress?: ProgressFn): Promise<ExtractedGame> {
  const json = async (name: string) => {
    const r = await fetch(`${base}data/${name}`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error(`no static data/${name}`);
    return r.json();
  };
  const casts: CastJson = await json('casts.json');
  const score = await json('score.json');
  const game: ExtractedGame = { casts, score, images: new Map(), sounds: new Map(), jpegs: new Map() };
  const urls: { url: string; type: string }[] = [];
  for (const cl of casts.castLibs) for (const m of cl.members) if (m.url && (m.type === 'bitmap' || m.type === 'sound')) urls.push({ url: m.url, type: m.type });
  let done = 0;
  const queue = urls.slice();
  const worker = async () => {
    while (queue.length) {
      const { url, type } = queue.shift()!;
      const bytes = new Uint8Array(await (await fetch(base + url)).arrayBuffer());
      if (type === 'sound') game.sounds.set(url, bytes);
      else if (/\.jpe?g$/i.test(url)) game.jpegs!.set(url, bytes);
      else game.images.set(url, await decodePng(bytes));
      onProgress?.(++done, urls.length, 'Reading static files');
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return game;
}
