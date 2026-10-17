# Research tools

Native tools for inspecting the original Director files with third-party decompilers and extractors. They are not
needed to play, develop or test the port: `npm run setup` produces the same data with the TypeScript extractor
(`src/extract/`). They are useful to cross-check the extractor, to read the decompiled Lingo the port is translated
from, and to regenerate the asset classes.

| File | Purpose |
|---|---|
| `scoredump/scoredump.cpp` | Dumps the cast libraries and score of `game.dcr` plus the `char_*.cct` casts to `casts.json` / `score.json` and copies member media ([docs/DATA_FORMAT.md](../docs/DATA_FORMAT.md)); built on LibreShockwave |
| `scoredump/fix_4bit_bitmaps.cjs` | Post-processing: re-decodes the 4-bit paletted bitmaps from their `BITD` chunks and corrects the one CLUT the LibreShockwave extractor misreads |
| `scoredump/fix_sounds.cjs` | Post-processing: writes every sound's complete MPEG stream and adds the sound timing fields to `casts.json` |
| `scoredump/last_run.txt` | scoredump's report for the original release (member counts, bitmap/palette checks, score statistics) |
| `castmeta.py` | Bitmap member metadata (size, reg point, depth, palette) from ProjectorRays `--dump-chunks` output |
| `gen_assets.py` | Generates `src/game/Class_Assets*.ts` from the decompiled Lingo asset classes |

## Third-party tools

The tools depend on third-party programs kept outside the repository in `local/tools/` (git-ignored):

| Path | Tool |
|---|---|
| `local/tools/projectorrays/` | ProjectorRays 0.2.0 (Lingo decompiler, chunk dumper) |
| `local/tools/libreshockwave/` | LibreShockwave source and Release build (`build/cpp/libreshockwave.lib`, `libreshockwave_asset_extractor.exe`) |
| `local/tools/zlib-src/`, `zlib-build/`, `zlib-install/` | zlib, built for LibreShockwave and scoredump |
| `local/tools/scoredump-build/` | scoredump's CMake build directory |

Their outputs also live in `local/`: the release folder `local/extracted/ttbattleblitz/`, ProjectorRays' decompiled
Lingo in `local/decompiled/` and chunk dumps in `local/meta/chunks/`, bitmap metadata in `local/meta/bitmaps.tsv`,
and the LibreShockwave extractor's output in `local/assets/<file>/` (`manifest.tsv`, `raw_chunks/`, media).

## Building and running scoredump (Windows, MSVC x64 + Ninja)

```
cmd /c "\"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat\" >nul 2>&1 && cmake -S research/scoredump -B local/tools/scoredump-build -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build local/tools/scoredump-build"

local\tools\scoredump-build\scoredump.exe local\extracted\ttbattleblitz local\assets public local\meta\bitmaps.tsv
node research/scoredump/fix_4bit_bitmaps.cjs
node research/scoredump/fix_sounds.cjs
```
Usage: `scoredump <movieDir> <extractedAssetsDir> <publicDir> [metaBitmapsTsv]`. It writes `public/data/casts.json`,
`public/data/score.json` and `public/assets/**`, and prints a run report. Both post-processing scripts run from the
repository root after every scoredump run and accept `--check` to report without writing. Game files are only read
as data. The result matches `npm run setup`'s output except for two pieces of `casts.json` metadata that scoredump
reads differently: the font fields of the two field/button members (it reads the style run's `fontId`/`fontStyle`
two bytes early) and the handler lists of the four scripts outside the Lingo cast (it resolves every script through
the file's first `Lctx`). Neither affects the game as played (the FPS field is hidden, the button belongs to the
online-only CN code).

Regenerating the asset classes:
```
python -I research/gen_assets.py local/decompiled/game/casts/Lingo src/game
python -I scripts/gen_classes.py src/game
```
