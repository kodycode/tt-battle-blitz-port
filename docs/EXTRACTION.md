# Game data extraction

The repository ships no game data. Players supply the original release, `ttbattleblitz.zip`, from the Internet
Archive (https://archive.org/details/ttbattleblitz). The port extracts everything it needs from that zip locally, in
the browser or with a Node command, and never serves game files itself.

## In the browser

On startup the page (`src/data/startup.ts`) uses the first available source:

1. the static files under `public/data` (development and tests), unless `?nostatic=1`;
2. the extracted game cached in IndexedDB (`src/data/cache.ts`);
3. the first-run screen (`src/data/firstrun.ts`): the player drops or picks the zip, its SHA-1 is checked
   (`b41c01eeedcef3c707decef5a52ffeff7de93dd5`), `extractGame` runs in a Web Worker (`src/data/extract.worker.ts`),
   the result is stored in IndexedDB and the game starts.

Query flags: `?reset=1` removes the stored data first; `?nostatic=1` ignores `public/data`; `?mem=1` (testing) reads
the static files into memory and runs the in-memory path on them. The IndexedDB cache key includes
`EXTRACT_VERSION`, so a changed extractor invalidates stored copies.

## In Node

`npm run setup` takes `local/original/ttbattleblitz.zip`, else `.cache/ttbattleblitz.zip`, else downloads the zip from
the Internet Archive into `.cache/`; verifies its SHA-1; runs `extractGame`; and writes `public/data/*.json` and
`public/assets/**` (PNG, JPEG, MP3) in the format of [DATA_FORMAT.md](DATA_FORMAT.md). Files whose content is
unchanged are left alone. Options: `npm run setup -- <zip>`, `--check` (compare instead of writing), `--out <dir>`.

## Extractor API (`src/extract/`)

```ts
export type ExtractedImage = { width: number; height: number; rgba: Uint8ClampedArray };
export type ExtractedGame = {
  casts: CastJson;   // casts.json (DATA_FORMAT.md)
  score: ScoreJson;  // score.json
  images: Map<string, ExtractedImage>; // key = the bitmap member's `url` in casts.json (e.g. "assets/hud/12_x.png"),
                                       // plus the JPEG members' `alphaUrl` masks (white RGB, alpha = mask; 2 in this game)
  sounds: Map<string, Uint8Array>;     // key = the sound member's `url` (MP3 bytes)
  jpegs: Map<string, Uint8Array>;      // key = the `url` of bitmap members with `format: "jpeg"` (6 in this game):
                                       // the JPEG stream exactly as stored in the movie (the browser decodes it)
  warnings: string[];                  // non-fatal notes (empty for the original release)
};
export async function extractGame(zip: Uint8Array, onProgress?: (done: number, total: number, stage: string) => void): Promise<ExtractedGame>;
export const EXTRACT_VERSION: string;  // changes whenever the output changes (cache key)
export function stringifyData(value: unknown, prettyDepth: number): string;
  // JSON text in the data files' layout: stringifyData(casts, 4) / stringifyData(score, 2)
```

- Pure TypeScript; runs in browsers and Node (no DOM APIs, no native tools). The only dependency is `fflate` (MIT)
  for the zip and zlib streams.
- Reads `game.dcr`, `char_*.cct` and `Dirapi.dll` from the zip. `Dirapi.dll` (the Director runtime) supplies
  Director's built-in palettes (systemWin, rainbow, ...) from its resources. Nothing from the zip is executed.
- Extraction of the full release takes about 1.5 s in Node.

Internals: [EXTRACTOR.md](EXTRACTOR.md).

## Verification

- `tests/extract.test.ts` (part of `npm test`, skipped without the zip or `public/data`): JSON byte for byte, sounds
  and JPEGs byte for byte, every bitmap pixel for pixel against `public/`.
- `node scripts/verify_extract.mjs [zip]`: the same comparison as a standalone report, with the first differing
  JSON path and per-file details.
- `npm run setup -- --check`: compares a fresh extraction with the files in `public/`.
- `node scripts/firstrun_test.mjs [zip]`: the browser flow end to end in a fresh profile.
