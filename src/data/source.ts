// Where the runtime's game data comes from. Both sources must give pixel-identical bitmaps and byte-identical
// sounds; the boot code (main.ts) only talks to this interface.
//   StaticSource: the files under public (data/casts.json, data/score.json, assets/**), fetched by URL.
//   MemorySource: an ExtractedGame (docs/EXTRACTION.md) held in memory: RGBA bitmaps, MP3 bytes, JPEG bytes.
import { LImage } from '../runtime/member';
import type { ScoreData } from '../runtime/score';
import type { CastJson, ExtractedGame } from './types';

export interface GameSource {
  readonly kind: 'static' | 'memory';
  casts(): Promise<CastJson>;
  score(): Promise<ScoreData>;
  // The decoded bitmap at `url`. ignoreAlpha: a 32-bit bitmap whose "use alpha" flag is off (drawn opaque).
  bitmap(url: string, ignoreAlpha: boolean): Promise<LImage | null>;
  // The sound file's bytes (a fresh buffer each call: decodeAudioData detaches it).
  soundBytes(url: string): Promise<ArrayBuffer>;
}

function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Browser-decoded image file (PNG/JPEG) by URL: the original boot path.
async function decodeImageFile(url: string, ignoreAlpha: boolean): Promise<LImage | null> {
  const opaque = ignoreAlpha ? await LImage.decodeIgnoringAlpha(url) : null;
  if (opaque) return opaque;
  const img = await loadImageElement(url);
  return img ? LImage.fromSource(img, img.width, img.height) : null;
}

export class StaticSource implements GameSource {
  readonly kind = 'static';
  constructor(private readonly castsJson: CastJson, private readonly scoreJson: ScoreData) {}

  // The static data when public/data is present. A dev server answers missing files with index.html, so
  // the response must actually be JSON.
  static async probe(base = ''): Promise<StaticSource | null> {
    const get = async (name: string) => {
      try {
        const r = await fetch(`${base}data/${name}`);
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
        return await r.json();
      } catch {
        return null;
      }
    };
    const [casts, score] = await Promise.all([get('casts.json'), get('score.json')]);
    return casts && score ? new StaticSource(casts, score) : null;
  }

  async casts(): Promise<CastJson> {
    return this.castsJson;
  }
  async score(): Promise<ScoreData> {
    return this.scoreJson;
  }
  bitmap(url: string, ignoreAlpha: boolean): Promise<LImage | null> {
    return decodeImageFile(url, ignoreAlpha);
  }
  async soundBytes(url: string): Promise<ArrayBuffer> {
    return (await fetch(url)).arrayBuffer();
  }
}

export class MemorySource implements GameSource {
  readonly kind = 'memory';
  constructor(readonly game: ExtractedGame) {}

  async casts(): Promise<CastJson> {
    return this.game.casts;
  }
  async score(): Promise<ScoreData> {
    return this.game.score;
  }
  async bitmap(url: string, ignoreAlpha: boolean): Promise<LImage | null> {
    const im = this.game.images.get(url);
    if (im) return LImage.fromRGBA(im.width, im.height, im.rgba, ignoreAlpha);
    // JPEG bytes go through the browser's decoder exactly like the static .jpg files.
    const jpeg = this.game.jpegs?.get(url);
    if (!jpeg) return null;
    const blobUrl = URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }));
    try {
      return await decodeImageFile(blobUrl, ignoreAlpha);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
  async soundBytes(url: string): Promise<ArrayBuffer> {
    const b = this.game.sounds.get(url);
    if (!b) throw new Error(`no sound ${url}`);
    return b.slice().buffer;
  }
}
