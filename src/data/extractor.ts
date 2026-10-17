// The extractor used by the first-run worker, the IndexedDB cache key and `npm run setup` (docs/EXTRACTION.md).
import * as extract from '../extract';
import type { ExtractedGame, ProgressFn } from './types';

// Part of the IndexedDB cache key (cache.ts): when the extractor exports its own EXTRACT_VERSION, a change to it
// invalidates caches made by older extractors. Bump the fallback when the extractor's output changes otherwise.
export const EXTRACT_VERSION = String((extract as Record<string, unknown>).EXTRACT_VERSION ?? 1);

export async function extractGame(zip: Uint8Array, onProgress?: ProgressFn): Promise<ExtractedGame> {
  return (await extract.extractGame(zip, onProgress)) as unknown as ExtractedGame;
}
