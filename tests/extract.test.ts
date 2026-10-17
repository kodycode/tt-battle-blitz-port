// End-to-end check of the zip extractor (src/extract, docs/EXTRACTION.md) against the data files in public/.
// Skipped when the original release zip (local/original/ttbattleblitz.zip or .cache/ttbattleblitz.zip) or the
// reference files are absent. The full media comparison lives in scripts/verify_extract.mjs; this test checks the
// JSON (values and file layout), the sounds and JPEGs byte for byte, and every bitmap pixel for pixel.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { extractGame, stringifyData, type ExtractedGame } from '../src/extract';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = [join(root, 'local', 'original', 'ttbattleblitz.zip'), join(root, '.cache', 'ttbattleblitz.zip')].find((p) => existsSync(p));
const pub = join(root, 'public');
const haveRef = existsSync(join(pub, 'data', 'casts.json')) && existsSync(join(pub, 'data', 'score.json'));

describe.skipIf(!zipPath || !haveRef)('extractGame (original release zip)', () => {
  let game: ExtractedGame;
  const load = async () => (game ??= await extractGame(new Uint8Array(readFileSync(zipPath!))));

  it('reproduces casts.json and score.json byte for byte', async () => {
    const g = await load();
    expect(stringifyData(g.casts, 4)).toBe(readFileSync(join(pub, 'data', 'casts.json'), 'utf8'));
    expect(stringifyData(g.score, 2)).toBe(readFileSync(join(pub, 'data', 'score.json'), 'utf8'));
  }, 120_000);

  it('reproduces every sound and JPEG byte for byte', async () => {
    const g = await load();
    for (const [url, data] of [...g.sounds, ...g.jpegs]) {
      const ref = join(pub, url);
      if (!existsSync(ref)) continue;
      expect(Buffer.from(data).equals(readFileSync(ref)), url).toBe(true);
    }
  }, 120_000);

  it('reproduces every bitmap pixel for pixel', async () => {
    const g = await load();
    let checked = 0;
    for (const [url, img] of g.images) {
      const ref = join(pub, url);
      if (!existsSync(ref)) continue;
      const png = PNG.sync.read(readFileSync(ref));
      expect([img.width, img.height], url).toEqual([png.width, png.height]);
      expect(Buffer.from(img.rgba.buffer, img.rgba.byteOffset, img.rgba.byteLength).equals(png.data), url).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  }, 120_000);
});
