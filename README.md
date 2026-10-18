# Teen Titans: Battle Blitz — browser port

A faithful TypeScript/HTML5-canvas port of Cartoon Network's 2003 Shockwave (Macromedia Director 8) fighting
game. The game's Lingo is ported class by class onto a small Director emulator, and the result runs in any
modern browser without a plug-in.

**Status:** verified 1:1 against the original Director runtime. Across 24 scripted scenarios
(menus, every fighter, summons, time-ups, unlock chains, villain mode) the port matches the original
`Projector.exe` tick for tick in game logic (random state, playhead), sprite state and pixels. See
[docs/VERIFICATION.md](docs/VERIFICATION.md).

No game data is in this repository or in any build of it: players supply their own copy of the original release,
which the port extracts locally (see [Quick start](#quick-start) and [Legal](#legal)).

## Requirements

- Node.js 18 or newer, npm
- A modern desktop browser
- The original release, `ttbattleblitz.zip` (12 MB), from the Internet Archive:
  https://archive.org/details/ttbattleblitz

The verification harness additionally needs Windows and Python 3 with `frida` and `Pillow`
([docs/VERIFICATION.md](docs/VERIFICATION.md)).

## Quick start

1. Download `ttbattleblitz.zip` from https://archive.org/details/ttbattleblitz
   (direct link: https://archive.org/download/ttbattleblitz/ttbattleblitz.zip).
2. Install and start the dev server from the repository root:
   ```
   npm install
   npm run dev
   ```
3. Open the printed URL and drop the zip on the page (or pick it). It is checked (SHA-1
   `b41c01eeedcef3c707decef5a52ffeff7de93dd5`), extracted in a Web Worker and kept in the browser's IndexedDB, so
   later visits start straight away. Nothing is uploaded. "Remove stored game data" (on the first-run screen, and
   until the first click or key press) or `?reset=1` deletes the stored copy.

For development and the tests, extract the data to files instead:
```
npm run setup
```
This uses `local/original/ttbattleblitz.zip` if present, else downloads the zip into `.cache/`, verifies it and
writes `public/data/*.json` and `public/assets/**`. A zip elsewhere: `npm run setup -- <path/to/zip>`.
`npm run setup -- --check` compares a fresh extraction with the existing files instead of writing.

The page loads `public/data` when present, else the IndexedDB copy, else the first-run screen (`?nostatic=1`
skips `public/data`). `npm run build` never copies `public/` into `dist/`, so a published build ships no game data.

## Controls

The game starts straight away, like the original player, and keeps running when its tab is in the background.
Browsers only allow sound after a click or key press, so audio begins with your first interaction (the title
screen's Start button). Arrow keys move and jump, Down blocks, Z punches, X kicks, P pauses, Esc leaves a fight.

The game renders at its native 600×400 and fills the window, keeping its 3:2 shape. By default every game pixel
is shown as a crisp block of its original colour: the frame is enlarged by pixel replication to the next whole
multiple of its size, and the browser fits that to the window, so only block edges are blended, over at most one
screen pixel. This adapts to window size, fullscreen and display scaling, up to 4K. The **Sharp pixels** button in
the bottom-right corner switches to smooth scaling and back; the choice is remembered. Add `?scale=N` to the URL for
exactly N×N screen pixels per game pixel.

## Project layout

| Path | Contents |
|---|---|
| `src/runtime/` | Director emulator: Lingo values, cast members, sprite channels and Director's renderer rules, score player, input, sound channels |
| `src/game/` | The game's Lingo, ported class by class ([docs/PORTING.md](docs/PORTING.md)) |
| `src/data/` | Data loading: static files or an in-memory extracted game, the first-run screen, extraction worker, IndexedDB cache |
| `src/extract/` | The zip extractor ([docs/EXTRACTION.md](docs/EXTRACTION.md), [docs/EXTRACTOR.md](docs/EXTRACTOR.md)) |
| `src/main.ts` | Entry point: game loop, deterministic test mode |
| `src/display.ts` | Display scaling: sharp pixels (default) or smooth, and the corner toggle |
| `tests/` | Unit tests (vitest) |
| `scripts/` | `setup.mjs` (data extraction), `run_port.mjs` (port captures), `smoke.mjs`, `perf.mjs`, `firstrun_test.mjs`, `verify_extract.mjs`, `gen_classes.py` (regenerates `src/game/classes.ts`) |
| `scripts/authoring/` | Bots that author verification scenarios by playing the port |
| `verification/` | 1:1 testing against the original: `harness/` (Frida harness for `Projector.exe`), `diff/` (comparers), `scenarios/` (input scripts) |
| `docs/` | Reference documentation (see below) |
| `research/` | Native tools for inspecting Director files ([research/README.md](research/README.md)); not needed to play or develop |
| `public/` | Extracted game data for development (git-ignored) |
| `local/` | Local, git-ignored files: the original release, captures, Ghidra projects, third-party tools |

## Testing

All commands run from the repository root.

| Command | What it checks |
|---|---|
| `npm test` | Unit tests; the extractor test runs when the zip and `public/data` are present |
| `npm run typecheck` | TypeScript |
| `node scripts/smoke.mjs <outDir> 20 "2:click:300,381"` | Boots the game headless, plays scripted input, reports page errors |
| `node scripts/firstrun_test.mjs [zip]` | First-run flow in a fresh browser profile: reject a wrong file, extract, IndexedDB reload, reset |
| `node scripts/verify_extract.mjs [zip]` | Extractor output against `public/` (JSON, pixels, sound and JPEG bytes) |
| `node scripts/run_port.mjs verification/scenarios/<name>.json` | Captures a scenario from the port |
| `node verification/diff/diff.mjs <name>` | Compares port and original captures |

The verification method, scenario format and harness are described in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Documentation

- [docs/PORTING.md](docs/PORTING.md) — rules for translating Lingo to TypeScript
- [docs/EXTRACTION.md](docs/EXTRACTION.md) — bring-your-own-data flow and the extractor API
- [docs/EXTRACTOR.md](docs/EXTRACTOR.md) — extractor internals
- [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md) — `casts.json`, `score.json` and the asset files
- [docs/VERIFICATION.md](docs/VERIFICATION.md) — verifying the port against the original runtime
- [docs/DIRECTOR_INTERNALS.md](docs/DIRECTOR_INTERNALS.md) — Director MX 2004 runtime behaviour the port reproduces

## Legal

Teen Titans: Battle Blitz — its code, art, music, sound and the Teen Titans characters and trademarks — belongs
to its owners (Warner Bros. Discovery / Cartoon Network / DC). This is an unofficial fan preservation project,
not affiliated with or endorsed by them.

This repository and any site built from it contain no game data: no game files, art, music or sound. Players
supply their own copy of the original release from the Internet Archive; it is extracted locally on their
machine. Extracted and downloaded data is git-ignored and must not be committed or published.

**License:** original code under the MIT License (see [LICENSE](LICENSE) and its scope note). The game itself is
not covered.
