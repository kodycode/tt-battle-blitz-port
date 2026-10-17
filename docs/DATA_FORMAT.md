# Data format

The port reads the game from two JSON documents plus media files, all produced from the original release by the
extractor ([EXTRACTION.md](EXTRACTION.md)):

| File | Contents |
|---|---|
| `data/casts.json` | every cast library and member of `game.dcr` (Director 8, Afterburner) and the external `char_*.cct` casts |
| `data/score.json` | the score of `game.dcr`: labels, frame scripts, palettes, sprite spans |
| `assets/<castLibName>/<memberNumber>_<sanitisedName>.<png\|jpg\|mp3>` | member media |

`npm run setup` writes these under `public/`; in the browser the same data is held in memory (bitmaps as RGBA,
sounds and JPEGs as bytes, keyed by the same URLs).

## Conventions (both files)

* A **member reference** is always `castLib` (1-based castLib number, in the movie's castLib order) plus `member`
  (the member number inside that castLib, the same number Lingo's `member(n, castLib)` uses). `memberName`/`name`
  are included for readability and are `null` when the slot is empty.
* Frames are 1-based and inclusive: `startFrame..endFrame`, `from..to`.
* Sprite `channel` uses Director sprite numbers (1 = `sprite(1)`). In the raw score, channels 0-5 are main channels
  and raw channel `n+5` is sprite `n`.
* Colours are `"#rrggbb"` strings. A plain integer colour is a palette index.
* URLs are relative to the data root (for example `assets/hud/13_hud_lifebar_bg.png`).
* Text is UTF-8. Field text is decoded as Windows-1252, and CR line breaks become `\n`.
* JSON layout: 1-space indentation down to a fixed depth (casts.json 4, score.json 2), deeper values on one line,
  no spaces, doubles as `%.6g`, minimal string escapes (`stringifyData` in `src/extract/json.ts`).

## casts.json

```jsonc
{
  "format": "tt-casts/1",
  "castLibs": [ CastLib, ... ]          // index i == castLib number i+1
}
```

### CastLib

| field | meaning |
|---|---|
| `number` | castLib number (1..25) |
| `name` | castLib name (`"Lingo"`, `"hud"`, `"char_Robin"`, ...) |
| `external` | true for the `char_*` casts |
| `fileName` | external casts: the file actually loaded (`"char_Robin.cct"`). The movie is authored pointing at `empty_*.cst`, and the game sets `castLib("char_X").fileName` at runtime. `null` for internal casts. |
| `authoredPath` | external only: the path stored in the movie |
| `loaded` | false for castLibs that have no cast data (`effects`, `tmp` are empty) |
| `minMember` | first member number of the cast (for example `select_screen` starts at 7) |
| `memberCount` | number of non-empty members listed |
| `members` | array of Member, sorted by `number`. Empty slots are omitted. |

### Member: common fields

| field | meaning |
|---|---|
| `number` | member number within the castLib |
| `name` | member name (may be `""`) |
| `type` | `bitmap`, `sound`, `script`, `field` (classic text/field), `text` (D8 text xtra), `button`, `shape`, `palette`, `filmloop` (also possible: `picture`, `movie`, `digitalvideo`, `richtext`, `transition`, `xtra`, `font`, `unknown`) |
| `chunkId` | CASt chunk id inside its file |

### type = bitmap

| field | meaning |
|---|---|
| `width`, `height` | image size in pixels |
| `regX`, `regY` | registration point, relative to the image's top-left corner. Draw the image at `(locH - regX, locV - regY)`. |
| `bitDepth` | 1, 2, 4, 8, 16 or 32 |
| `palette` | only when `bitDepth <= 8`. Either `{castLib, member, name}` (the palette member used) or `{system: "systemMac" \| "systemWin" \| "grayscale" \| ...}` (built-in, from clutId <= 0, id = clutId - 1). `castLibRaw` is the stored clutCastLib when it is -1 (own cast) or 0 (stale). `resolvedBy: "search"` means clutCastLib is 0 and the palette is not in the bitmap's own cast, so the first castLib with a palette at that member number is used (4 bitmaps: `intro_text_01/02`, `back_button(_over)`, which resolve to select_screen `SELECT-PALLETTE.act`). `name` is null when nothing resolves (14 1-bit char_Robin `*a`/`*d` frames point at member 1 with castLib 0). The image is already resolved to RGB. |
| `url` | PNG (or JPEG, see below). `null` only for `empty` bitmaps. |
| `hasAlpha` | PNG only: true if any pixel has alpha < 255. Only `win_screen` `endtext_score` has it. |
| `index0Color` | only present when palette index 0 of this bitmap is **not** white: the RGB colour of index 0 (see "Inks" below). No member of this game has it. |
| `whitePixelsNotIndex0` | only present when white pixels use a palette index other than 0. No member of this game has it. |
| `useAlpha`, `alphaThreshold` | 32-bit only: the member's "use alpha" flag (false for all 6 in this game) and its threshold |
| `format` | `"jpeg"` for JPEG-compressed members (url is a `.jpg`, the stream exactly as stored). Otherwise absent (PNG). |
| `alphaOpaque`, `alphaUrl` | JPEG with an ALFA chunk: `alphaOpaque` is true when the alpha is all 255. Otherwise `alphaUrl` is a PNG mask (white RGB, alpha = mask). Apply it only if `useAlpha` is true; it is false here, so Director ignores the alpha. |
| `empty` | true for 0x0 placeholder bitmaps (Lingo cast "`>> Screen_Title`" etc. are used as sprite placeholders) |

Pixels are decoded from the `BITD` chunk with the palette resolved as above. PNGs are RGB for 4-bit bitmaps with a cast
palette and RGBA otherwise. 1-bit bitmaps are black on white; Director tints 1-bit images with the sprite's
foreColor/backColor.

### type = sound

| field | meaning |
|---|---|
| `url` | `.mp3`: the member's complete MPEG-2 Layer III stream (22050 Hz mono), every frame of its `snd ` chunk unchanged |
| `loop` | member "loop" flag (CASt info flag 0x10 clear). True for `music_*`, `*_loop` and the stage ambience members (14 in all). Director loops the whole sound. |
| `sampleRate` | 22050 (snd header) |
| `sampleCount` | Director's length of the sound in samples (extended snd header `numFrames`). `duration = sampleCount / sampleRate`. |
| `skipSamples` | decoder output samples Director drops before sample 0 (1500 for every sound) |
| `mpegSamples` | samples the MP3 decodes to (frames x 576). Play (and loop) exactly `[skipSamples, skipSamples + sampleCount)` of the decoded MP3; `src/runtime/audio.ts` does this with `AudioBufferSourceNode` offset/duration/`loopStart`/`loopEnd`. |
| `cuePoints` | only when the member has a `cupt` chunk: `[{time (ms), name}]`. music_loop2..5 have "Loop start" at 0 and "Loop end" at the end of the sound (`numFrames / 22050` s), so the loop region is the whole sound. Cue points are not loop points in Director, and no sound has snd-header loop points. |

Every sound is a Director Shockwave Audio `snd ` chunk: a Mac `snd ` resource (format 2, extended header,
`numFrames` = length in samples, 22050 Hz), a 4-byte big-endian decoder skip (1500), then plain MPEG-2 Layer III
frames up to the end of the chunk; the whole stream is in that one chunk. The SWA Decompression Xtra
(`SWADCmpr.x32`, FUN_6d341c25 reads the skip, FUN_6d341b29 discards it) drops `skip` decoded samples and plays
`numFrames` samples, which is what `skipSamples`/`sampleCount` describe.

### type = field / button (classic STXT text)

`text`, `alignment` (`left`/`center`/`right`), `bgColor`, `rect` `[left, top, right, bottom]`, `border`, `margin`,
`boxShadow`, `boxType`, `font` (font name from the cast's font map, or `null` if it does not resolve), `fontId`,
`fontSize`, `fontStyle` (raw style bits), `color`, `styleRuns` (only when there is more than one style run),
`buttonType` (buttons only). This game has two: `hud` `FPS` (Arial) and a CN "Play Again" button (Courier).

### type = text (D8 text xtra)

`text`, `font`, `fontSize`, `fontStyle` (string), `alignment`, `color`, `width`, `height`, `wordWrap`, `antialias`.

### type = script

| field | meaning |
|---|---|
| `scriptType` | `score` (frame script or sprite behaviour), `movie`, `parent` (also possible: `behavior`, `unknown`) |
| `handlers` | handler names, for example `["exitFrame"]` |
| `properties` | declared property names |

Only the names are extracted; the port has its own TypeScript translation of every script.

### type = shape

`shapeType` (1 rect, 2 round rect, 3 oval, 8 line), `width`, `height`, `regX`, `regY`, `color`, `backColor`,
`fillType`, `lineThickness`.

### type = palette

`colors`: array of `"#rrggbb"` strings, in palette index order.

### type = filmloop

| field | meaning |
|---|---|
| `width`, `height` | size of the loop's bounding rect |
| `regX`, `regY` | `width/2`, `height/2`. The loop is centred on the sprite loc, which matches how the score places them. |
| `filmLoop.rect` | `[left, top, right, bottom]` bounding rect in the loop's own coordinate space (the authoring stage coordinates) |
| `filmLoop.center`, `crop`, `sound`, `loops` | film loop member flags |
| `filmLoop.frameCount` | number of frames in the loop |
| `filmLoop.sprites` | sub-sprite spans, in **exactly the same format as `score.json` `sprites`** |
| `filmLoop.frameScripts`, `filmLoop.otherMainChannelsRaw` | same as in score.json. Only present when non-empty. |

Rendering film loop frame `f` (1..frameCount, looping): build a `width x height` canvas, and for each sub-sprite state
covering `f` draw its member at `(locH - member.regX - rect.left, locV - member.regY - rect.top)`. Then draw that
canvas like a bitmap with `regX`/`regY` above. Sub-sprite castLib 0/0xFFFF ("own cast") is already rewritten to the
loop's castLib.

## score.json

```jsonc
{
  "format": "tt-score/1",
  "stage": {"width": 600, "height": 400, "left": 89, "top": 50, "bgColor": "#000000"},
  "tempo": {"configTempo": 999, "note": "..."},
  "frameCount": 1198, "decodedFrames": 1198,
  "framesVersion": 13, "spriteRecordSize": 48,
  "spriteChannelCount": 1000, "maxSpriteChannelUsed": 150,
  "labels": {"SCREEN_TITLE": 30, ...},           // name -> frame
  "labelList": [{"frame": 1, "name": "Titlecard"}, ...],   // in score order
  "frameScripts": [FrameScript, ...],
  "palettes": [PaletteRun, ...],
  "tempoChannel": [], "sound1": [], "sound2": [], "transitions": [],
  "otherMainChannelsRaw": {"raw1": [], "raw2": [], "raw3": [], "raw4": []},
  "sprites": [SpriteSpan, ...]
}
```

* **Tempo.** The score tempo channel is empty. The movie config tempo is 999, `Global_Main` calls `puppetTempo(999)`,
  and the game throttles itself with `Class_Globals.FRAME_RATE = 30` (`FRAME_DURATION_MIN = 1000/30`). Run the score
  at 30 fps.
* **Main channels 1-4** (tempo/transition/sound1/sound2) are all-zero for the whole main score, so `tempoChannel`,
  `sound1`, `sound2` and `transitions` are always empty. If a raw main channel holds data, it appears in
  `otherMainChannelsRaw.rawN` as `{startFrame, endFrame, rawHex}`; some film loops have `fffe...` in raw 2-4. Sound
  in this game comes from Lingo (`Behavior_AudioEvent`), not from score sound channels.

### FrameScript (raw channel 0)

`{startFrame, endFrame, castLib, member, name, behaviors: [Behavior...]}`, one entry per run of frames with the same
script. Frames with no entry have no frame script. `behaviors` lists the script(s) attached to that script-channel
span; normally the same single script with `params: null`.

### PaletteRun (raw channel 5)

`{startFrame, endFrame, castLib, member, name | system, rate, flags}`. `castLib` -1 means a built-in palette
(`system`: for example `"systemMac"`). `rate` and `flags` are the raw palette-transition bytes.

### SpriteSpan

One entry per sprite span (a contiguous run of frames in one channel that belongs to one score "sprite"), the thing
Director shows as one bar in the score.

| field | meaning |
|---|---|
| `channel` | sprite number (1-based) |
| `startFrame`, `endFrame` | span extent (inclusive), equal to the span's interval record |
| `behaviors` | all behaviours attached to the span, in attachment order: `[Behavior...]` (may be empty) |
| `states` | run-length list of the per-frame sprite properties covering the span, in frame order. Each state holds the full property set for frames `from..to`. A new state starts whenever any property changes (tweens produce one state per frame). |

**Behavior**: `{castLib, member, name, paramsRaw, params}`

* `paramsRaw`: the initializer exactly as stored (a Lingo property list literal), or `null`.
* `params`: the same data parsed to JSON, or `null`. Symbols stay strings with `#` (`"#SFX_X"`), strings become JSON
  strings, integers and floats become numbers, `TRUE`/`FALSE` become 1/0, `VOID` becomes null, nested lists become
  arrays/objects, and `point(..)`/`rect(..)`/`rgb(..)` stay as source text. Example:
  `{"soundName": "#SFX_CHARACTERSWITCH2", "assetGroup": "#AUDIO", "volumeLevel": 100, "stopAtEndSprite": 0}`.

**State**:

| field | meaning |
|---|---|
| `from`, `to` | frames covered by this state (inclusive) |
| `castLib`, `member`, `memberName` | member shown. `0/0` means no member. Placeholder sprites use the 0x0 Lingo bitmaps such as `">> Screen_Title"` and only carry a behaviour. |
| `locH`, `locV` | position of the member's registration point on the stage |
| `width`, `height` | stored sprite rect size. **Only used when `stretch` is set** (then the reg point scales too: left = `locH - regX * width / member.width`). Without `stretch`, bitmaps and film loops are drawn at the member's own size and the stored size is stale authoring data (e.g. `intro_cyborg` stored as 1252x771). Shapes always use the stored size. |
| `ink` | Director ink number (0 copy, 7 not ghost, 8 matte, 36 background transparent, 39 darkest, 41 darken, ...) |
| `blend` | 0..100 (100 = opaque), `round((255 - raw) * 100 / 255)` |
| `blendRaw` | present when the raw blend byte is non-zero: 0 = opaque .. 255 = invisible. Several raw values share one rounded percentage, and Director mixes with level `(0xFF00 - raw * 0x100) / 0xFF` ([DIRECTOR_INTERNALS.md](DIRECTOR_INTERNALS.md) section 6), so the renderer uses this byte. |
| `trails`, `stretch` | present only when true (raw ink-byte bits 0x40 / 0x80) |
| `flipH`, `flipV` | present only when true (sprite flag bits 0x20 / 0x40) |
| `flagsRaw` | raw sprite flag byte (bit 0x80 masked off) when it is not the usual `1`: low nibble = line thickness, 0x20 flipH, 0x40 flipV, 0x10 meaning unknown |
| `foreColor` | present only when not the default (palette index 255 = black), or when RGB (`"#rrggbb"`) |
| `backColor` | present only when not the default (palette index 0 = white), or when RGB |
| `rotation`, `skew` | degrees, present only when non-zero |

To get the sprites on frame `f`, take every span with `startFrame <= f <= endFrame`, then the state with
`from <= f <= to`. Draw in ascending `channel` order unless Lingo changes `locZ` (see `Behavior_SetLocZ`
`#locZLayer` params).

## Inks and transparency

* The PNGs have no alpha except `win_screen` `endtext_score`, which is 32-bit with `useAlpha` false. Transparency
  comes from inks.
* Ink 36 (background transparent) and ink 8 (matte) key out the sprite's `backColor`, which is index 0 (white) by
  default. For paletted sources Director compares the **palette index**. In this game every 2-8-bit bitmap uses
  index 0 only for white, and no white pixel uses another index, so keying pure white (`#ffffff`) in RGB is
  equivalent to the index test. (106 of the 8-bit bitmaps have a palette with white more than once, but no pixel
  uses a duplicate white.)
* Ink 8 (matte) removes only background-coloured pixels connected to the image edge (flood fill). Ink 36 removes
  all of them.

## Binary layout notes (D8 score)

This movie has `framesVersion 13` but uses 48-byte sprite records and 1006 channels (6 main + 1000 sprite channels),
not the D6 layout (144-byte main channels plus 120 x 24-byte channels) that version number suggests. `VWSC`:

* `entries[0]`: header (u32 len, u32, u32 frameCount, u16 framesVersion, u16 recSize, u16 numChannels, u16), then
  per frame `u16 len` and `{u16 size, u16 offset, bytes}` deltas onto the previous frame.
* Channel 0 (frame script): u16 castLib, u16 member, u32 interval index. Channel 5 (palette): i16 castLib, i16
  member, u8 rate, u8 flags, ..., u32 interval index at +16.
* Sprite record (48 bytes): u8 type, u8 ink (0x40 trails, 0x80 stretch), u8 fore, u8 back, u16 castLib, u16 member,
  u32 interval index, i16 locV, i16 locH, u16 height, u16 width, u8 colour flags (hi nibble 1 = fore RGB, 2 = back
  RGB; lo nibble = cosmetic score colour), u8 blend (0 = 100%, 255 = 0%), u8 flags, u8, u8 foreG, u8 backG, u8 foreB,
  u8 backB, i32 rotation*100, i32 skew*100, ...
* `entries[1]`: u32 count, then `count` interval indexes. `entries[idx]` is the interval (i32 start, i32 end, i32,
  i32, i32 rawChannel, ...), and `entries[idx+1]` holds the behaviours, 8 bytes each (u16 castLib, u16 member, u32
  initializer entry index). `entries[init]` is the initializer text.
* Cast libraries map to `CAS*` chunks through the `KEY*` table (owner == MCsL entry id). Member number = cast
  `minMember` + index in `CAS*`.
