# Extractor internals

`src/extract/` turns the original release (`ttbattleblitz.zip`) into the port's data: `casts.json` / `score.json`
values, bitmaps (RGBA), sounds (MP3) and JPEG streams. Interface and usage: [EXTRACTION.md](EXTRACTION.md). Output
format: [DATA_FORMAT.md](DATA_FORMAT.md). Pure TypeScript on `Uint8Array`/`DataView`; runs in browsers (Web Worker)
and Node.

| module | contents |
|---|---|
| `index.ts` | `extractGame` / `extractFromFiles`: cast libraries, member JSON, palette resolution, film loops, score |
| `zip.ts` | release zip access (fflate) |
| `rifx.ts` | Director containers: Afterburner (`FGDM`/`FGDC`: Fver, Fcdr, ABMP, FGEI + initial load segment) and plain RIFX (imap/mmap) |
| `cast.ts` | key table (`KEY*`), cast list (`MCsL`), cast arrays (`CAS*`), `CASt` members (info list, specific data), movie config (`DRCF`/`VWCF`) |
| `script.ts` | script context (`Lctx`), names (`Lnam`), handler/property names from `Lscr` |
| `bitmap.ts` | bitmap specific data, `BITD` PackBits rows, 1/2/4/8-bit indices, 16-bit (5-5-5) and 32-bit (planar ARGB) pixels |
| `palette.ts` | `CLUT` chunks, built-in palettes (systemMac generated; the others decoded from Dirapi.dll resources) |
| `pe.ts` | minimal PE resource reader for Dirapi.dll |
| `image.ts` | indexed pixels -> RGBA with the resolved palette, `index0Color` probe, JPEG size |
| `sound.ts` | Shockwave Audio `snd ` chunks -> complete MPEG stream, sample counts, `cupt` cue points |
| `text.ts` | fields/buttons (`STXT`, field data, `Fmap`), D8 text members (`XMED`, minimal) |
| `score.ts` | `VWSC` (D7/D8 48-byte channel records, frame deltas, intervals, behaviours), labels (`VWLB`) |
| `lingo.ts` | behaviour initializer (Lingo property list literal) parser |
| `json.ts` | JSON text in the data files' layout |
| `bytes.ts` | readers, varints, text decoding (UTF-8 / Windows-1252), asset name sanitising |

## Decoding rules

* **Palettes.** Resolved per cast library: `clutCastLib` > 0 names the cast, -1 the bitmap's own cast, 0 the own cast
  if it has a palette at that member number, else the first cast that does. Cast palettes with 256 entries get black
  entries 246-255 replaced by the Mac system colours; CLUT components are rounded `v * 255 / 65535`.
* **Built-in palettes** on 2/4-bit bitmaps spread the indices over the 256-entry table (`i * 255 / (2^depth - 1)`);
  palette id -8 (web216) decodes with systemMac. Director's built-in palettes are read from the RT_RCDATA resources
  of the user's own `Dirapi.dll`, not embedded in the port.
* **1-bit bitmaps** are black on white; those without palette fields record `clutCastLib 0`, `clutId 1`.
* **Script context.** Each cast owns its own `Lctx` (found through the key table), so a member's `scriptId` resolves
  in its own cast's script context.
* **Text.** Field/button style runs are 20 bytes: `{u32 startOffset, u16 height, u16 ascent, u16 fontId, u8 style,
  u8, u16 size, u16 r, u16 g, u16 b}`; `fontId` resolves through the cast's `Fmap`. The single D8 text member
  (`scratch` "...read me") is decoded from a minimal reading of `XMED` (text, first font, size, style bits, colour,
  paragraph alignment) and the member's specific data (width, height, antialias, word wrap); this layout is inferred
  from that one member.
* **Sounds.** Every MPEG frame of the `snd ` chunk is written unchanged, from the first frame to the end of the
  chunk (MPEG-2/2.5 Layer III frames are `72 * bitrate / rate` bytes plus padding).

## Licensing and provenance

The extractor is an independent implementation. No code from LibreShockwave (AGPL-3.0), ProjectorRays, ScummVM or any
other copyleft project is copied or translated. Sources that informed it:

* Public descriptions of the Director/Shockwave file formats: the RIFX/`imap`/`mmap` container, the Afterburner
  (`FGDM`/`FGDC`) layout with `Fver`/`Fcdr`/`ABMP`/`FGEI` and variable-length integers, and the `KEY*`, `MCsL`,
  `CAS*`, `CASt`, `Lctx`/`Lnam`/`Lscr`, `BITD`, `CLUT`, `STXT`, `VWSC` and `VWLB` chunk layouts, as documented in the
  ScummVM wiki's Director format notes and in ProjectorRays' format write-ups.
* Apple's documentation of the Macintosh `snd ` resource, the MPEG audio frame header, and PackBits.
* This repository's own research tools and notes ([research/](../research/README.md),
  [DIRECTOR_INTERNALS.md](DIRECTOR_INTERNALS.md)).
* Inspection of the user's `Dirapi.dll` for the format of its palette resources.
