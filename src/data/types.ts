// Game data handed to the runtime: the cast/score JSON exported from the original movie plus its bitmaps and
// sounds. It comes either from the static files under public (development, verification tests) or from an
// in-memory ExtractedGame (the extractor's output, see docs/EXTRACTION.md), possibly restored from IndexedDB.
import type { ScoreData } from '../runtime/score';

export type CastMemberJson = {
  number: number;
  name: string;
  type: string;
  width?: number;
  height?: number;
  regX?: number;
  regY?: number;
  bitDepth?: number;
  url?: string | null;
  loop?: boolean;
  text?: string;
  [k: string]: unknown;
};

export type CastJson = {
  castLibs: {
    number: number;
    name: string;
    fileName: string | null;
    members: CastMemberJson[];
  }[];
};

export type ExtractedImage = { width: number; height: number; rgba: Uint8ClampedArray };

// The extractor's result (docs/EXTRACTION.md). `jpegs` holds the JPEG-compressed bitmaps' original bytes (decoded by
// the browser like the static .jpg files); an extractor may instead decode them into `images`.
export type ExtractedGame = {
  casts: CastJson;
  score: ScoreData;
  images: Map<string, ExtractedImage>;
  sounds: Map<string, Uint8Array>;
  jpegs?: Map<string, Uint8Array>;
};

export type ProgressFn = (done: number, total: number, stage: string) => void;
