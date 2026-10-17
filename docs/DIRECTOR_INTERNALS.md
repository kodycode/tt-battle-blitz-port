# Director MX 2004 runtime internals

How the Director MX 2004 (10.1) runtime that ships with the game (`Projector.exe`, `Proj.dll`, `Dirapi.dll`,
`Iml32.dll`) implements the behaviour the port reproduces: the RNG, clocks, input, the frame loop, sprite channels,
the score player and the renderer. The verification harness ([VERIFICATION.md](VERIFICATION.md)) hooks the
addresses given here, and the port's runtime (`src/runtime/`) implements the rules.

## Conventions

Image bases: Dirapi.dll 0x68000000, Iml32.dll 0x69000000, Proj.dll 0x10000000, Projector.exe 0x20000000. Addresses
are VAs at the preferred base; RVA = VA - base. The DLLs have no ASLR flag, but code that hooks them should still use
`module base + RVA`. `FUN_xxxxxxxx` names a function by its VA.

Iml32.dll is the platform layer. Most of its 741 exports are ordinal-only; Dirapi imports about 550 of them by
ordinal (`Ordinal_NNNN` = Iml32 export ordinal; export VA = 0x69000000 + export RVA).

Lingo symbol ids: Dirapi keeps the built-in symbol names in two contiguous string tables, table A at 0x6814ABB4 (ids
0..350) and table B at 0x681430F4 (ids 351..1593). Built-in handlers are registered by id via
`RegisterBuiltin(ctx, id, fn, ...)` = FUN_680D05D1 (mostly called from FUN_680D0637 and FUN_680B3E56). Useful ids:
random 0x9C, randomSeed 0x10E, milliSeconds 0x111, ticks 0x12B, frame 0x3C, keyPressed 0x2DB, timer 0x199.

## 0. The projector process

Only one `Projector.exe` can run at a time. A second instance loads `gamewrapper.dir`, plays the two wrapper frames,
opens `game.dcr` and then never advances another score frame (Proj's idle loop keeps calling the timeout check, but
no prepareFrame/exitFrame and no game Lingo run) while the first instance is alive. At startup the projector creates
`%TEMP%\TempFolder.aas\Macromedia.lok` and a temporary `tmpXXXX.tmp` in the movie folder, and deletes them itself.

## 1. Lingo `random()` and `the randomSeed`

### Addresses
| what | VA (Dirapi) | notes |
|---|---|---|
| Lingo `random` builtin handler | 0x680D1895 | registered `RegisterBuiltin(ctx, 0x9C, 0x680D1895)` at 0x680D08C5 |
| RNG core `int RandomCore(int n)` (stdcall, `ret 4`) | 0x6800992B | |
| `void SetRandomSeed(int seed)` (stdcall) | 0x68009979 | |
| `int GetRandomSeed(void)` | 0x6800999F | returns `g_rng.state` |
| RNG state struct `g_rng` | 0x68152038 | .bss, zero at load |
| `g_rng.state` (u32) | 0x68152038 | this is `the randomSeed` |
| `g_rng.poly` (u32) | 0x6815203C | 0xA3000000 after init |
| `g_rng.mask` (u32) | 0x68152040 | unused by the step (init writes `(1<<32)-1` with x86 shift-count masking = 0) |
| `LfsrInit(rng*, bits)` = Iml32 Ordinal_1050 | 0x6903C1B0 | |
| `Hash(u32)` = Iml32 Ordinal_1051 | 0x6903C1F0 | |
| `the randomSeed` get/set | FUN_680B0849 case 0x10E (and FUN_680CF196 at 0x680CF280) | set calls SetRandomSeed, get calls GetRandomSeed |
| startup seeding | FUN_6800F05E at 0x6800F0AB..0x6800F0BA | player/movie-context init |

### Algorithm
A 32-bit Galois LFSR (taps 0xA3000000) whose state is passed through an integer hash.

```c
struct { uint32 state, poly, mask; } g_rng;            // @0x68152038, zero-initialised (.bss)

void LfsrInit(rng *r, int bits /*=0x20*/) {           // Iml32 Ordinal_1050 @0x6903C1B0
  if (bits < 2 || bits > 32) bits = 32;
  r->state = 1;
  r->mask  = (1 << (bits & 31)) - 1;                   // = 0 for 32 (unused)
  r->poly  = kPolyTable[bits];                         // table @Iml32 0x69087188; [32] = 0xA3000000
}

int32 Hash(int32 x) {                                  // Iml32 Ordinal_1051 @0x6903C1F0, all mod 2^32
  int32 a = ((x << 13) ^ x) - (x >> 21);               // >> is arithmetic (SAR)
  int32 b = ((((a*a*0x3D73 + 0xC0AE5) * a) - 0x2DF722F3) & 0x7FFFFFFF) + a;
  return ((b << 13) ^ b) - (b >> 21);                  // SAR
}

int32 RandomCore(int32 n) {                            // Dirapi 0x6800992B
  if (g_rng.state == 0) LfsrInit(&g_rng, 32);
  g_rng.state = (g_rng.state & 1) ? (g_rng.state >> 1) ^ g_rng.poly   // logical shift
                                  : (g_rng.state >> 1);
  int32 h = Hash(g_rng.state * 0x47);
  if (n > 0) h = (h & 0x7FFFFFFF) % n;                 // signed idiv, both operands >= 0
  return h;                                            // n <= 0: raw hash (any int32)
}

void SetRandomSeed(int32 seed) {                       // Dirapi 0x68009979  (= `the randomSeed = seed`)
  LfsrInit(&g_rng, 32);                                // state = 1, poly = 0xA3000000
  if (seed != 0) g_rng.state = seed;                   // seed 0 behaves like seed 1
}
int32 GetRandomSeed() { return g_rng.state; }         // `the randomSeed` (the CURRENT LFSR state)
```

The Lingo handler (0x680D1895) coerces its arguments to integers (type 4) with FUN_680C7629/FUN_680C7602; a float
argument is rounded half away from zero by FUN_680C5C17, like `integer()` (ftol truncation only if ctx+0xD4 < 0):
```c
random(a [, b = a]):
  if (a < b) result = RandomCore(b - a + 1) + a;       // random(a, b): a..b inclusive
  else       result = RandomCore(a) + 1;               // random(n): 1..n
```
Edge cases: `random(n)` with n <= 0 returns `Hash(...) + 1` (an arbitrary int32; the LFSR still advances);
`random(a, b)` with b <= a is `random(a)`. Every call advances the LFSR exactly once, also for n = 1.
`the randomSeed` reads back the current state, so `x = the randomSeed; ...; the randomSeed = x` replays a sequence.
The only other RandomCore caller is FUN_680BFCE6 (`randomVector()`). JavaScript `Math.random` (0x680F96E8) is
SpiderMonkey's own 48-bit LCG with separate state; Lingo does not touch it.

### Seeding at startup
FUN_6800F05E (creates the player/movie context, runs once at startup) calls
`SetRandomSeed(Ordinal_1542() + Ordinal_1546())`: Ordinal_1542 @0x6902D5D0 is msvcrt `time(NULL)` (Unix seconds),
Ordinal_1546 @0x6902D580 the ticks clock (section 2). A deterministic run calls `SetRandomSeed(seed)` (or writes
`state = seed ? seed : 1`, `poly = 0xA3000000`) after FUN_6800F05E and before `game.dcr`'s prepareMovie, e.g.
`new NativeFunction(base.add(0x9979), 'void', ['int'], 'stdcall')(seed)` on the main thread. The game's Lingo does
not call `random` during the wrapper and title screens.

### TypeScript equivalent
`src/runtime/lingo.ts` (`random(a, b?)`, `setRandomSeed`, `getRandomSeed`) implements it bit for bit; golden vectors
taken from Dirapi's own RNG are in `tests/lingo.test.ts`.
```ts
let state = 0, poly = 0;                                         // u32
const init = () => { state = 1; poly = 0xa3000000; };
function hash(x: number): number {
  x |= 0;
  const a = (((x << 13) ^ x) - (x >> 21)) | 0;
  let b = (Math.imul((Math.imul(Math.imul(a, a), 0x3d73) + 0xc0ae5) | 0, a) - 0x2df722f3) & 0x7fffffff;
  b = (b + a) | 0;
  return (((b << 13) ^ b) - (b >> 21)) | 0;
}
function core(n: number): number {
  if (state === 0) init();
  state = (state & 1 ? (state >>> 1) ^ poly : state >>> 1) >>> 0;
  const h = hash(Math.imul(state, 0x47));
  return n > 0 ? (h & 0x7fffffff) % n : h;
}
export function setRandomSeed(seed: number) { init(); if (seed | 0) state = seed >>> 0; }
export const getRandomSeed = () => state | 0;
export const random = (a: number, b = a) => (a < b ? core(b - a + 1) + a : core(a) + 1) | 0;
```

## 2. Clocks: `the milliSeconds`, `the ticks`, `the timer`

All Director clocks come from one function: Iml32 export ordinal 1541 at **0x6902D5C0** = `jmp [IAT timeGetTime]`
(winmm). Ordinal 1545 (0x6902D5B0) is `jmp 0x6902D5C0`; ordinal 1546 (ticks, 0x6902D580) calls 0x6902D5C0. Dirapi
imports 1541/1545/1546 by ordinal. Nothing in Director uses GetTickCount or QueryPerformanceCounter for Lingo time:
Dirapi's only GetTickCount use is FUN_6809FF21 (date/UUID code), Iml32's GetTickCount users 0x69023AE0/0x69021EC0 are
cursor-animation helpers, and `time()` serves the RNG seed and `date()`. Iml32's other timeGetTime callers
(0x6903BEF0, 0x69052D9E/0x69052E16) also go through 0x6902D5C0. Replacing **0x6902D5C0** (no arguments, returns u32)
therefore moves every Lingo clock, the tempo scheduler, keyPressed timestamps and lastEvent/lastKey/lastClick.

```c
// Dirapi 0x6801ED97  int MilliSeconds(ctx)   (Lingo `the milliSeconds`, symbol 0x111), stdcall
g = *(*(ctx+8)+4);                                  // movie context (same g as in sections 3/4)
if      (g[0x79B8] == 0) v = g[0x79CC];             // clock frozen
else if (g[0x79BC] == 1) v = timeGetTime();         // normal
else if (g[0x79BC] == 2) v = 2*timeGetTime() - g[0x79CC];
return g[0x79C8] + v;
// Dirapi 0x6801ED44  int Ticks(ctx)          (Lingo `the ticks`, symbol 0x12B; builtin fn 0x680D1CF0)
//   same, with Ordinal_1546() and fields 0x79C4 (frozen value) / 0x79C0 (offset).
// Iml32 0x6902D580  Ordinal_1546:
return (int) rint( (float)( (double)(uint32)timeGetTime() * 0.06f ) );
//   fild u64, fmul float32 0.06, fstp float32 (!), fistp (round-to-nearest-even)
```
In the projector g[0x79B8] = 1, g[0x79BC] = 1 and the offsets g[0x79C0] = g[0x79C8] = 0, so
**`the milliSeconds` == timeGetTime()** (ms since boot, no start offset) and
**`the ticks` == rint(float32(timeGetTime() * 0.06f))**, i.e. round-half-even(ms * 0.06) computed in float32. The
0x79B8..0x79CC fields are only changed by FUN_6800C6D1 (pause/time scale, unused by the projector); init
FUN_6800F348 sets 1, 1, 0, 0, 0, 0.

`the timer`: property handler FUN_68013DAE case 0x13 (movie property group 6): get = `Ticks() - g2[0x75B4]`, set
(`startTimer` / `the timer = v`) does `g2[0x75B4] = Ticks() - v` (g2 = movie context; the timeout logic FUN_68011339
uses the same base). Cases 0xE..0x12 (lastClick/lastEvent/lastKey/lastRoll) are also `Ticks() - stamp`.

The game uses `the milliSeconds` (the `Class_Main.update` busy-wait, section 4) and `the ticks` (CN billboard script,
Play-Game). It uses `the timer` only in the tracker path, which never runs offline.

## 3. Keyboard and mouse

### keyPressed(code)
The Lingo `keyPressed` builtin is 0x680B4D5C (symbol 0x2DB). An integer argument goes to FUN_6801E13A(ctx, macCode)
(stdcall, `ret 8`):
```c
FUN_6801E13A(ctx, code):
  r = FUN_6801D64C(ctx) ? Ordinal_1770(code) : 0;   // focus gate
  movieglobals[0x28] = Ordinal_1545();              // timeGetTime stamp
  return r;
FUN_6801D64C(ctx) (stdcall, ret 4): in the projector returns Ordinal_1808(stageHwnd)
                                    = (GetFocus() == stageHwnd)   [Iml32 0x69026B80]
Iml32 Ordinal_1770 @0x6906D140 (KeyPressedMac, stdcall, ret 4):
  vk = MacToVk[code & 0xFF] (if code < 0x83, else 0);  // inverse of the VK->Mac table @Iml32 0x69086BD4
                                                     // (built once; the highest VK wins on duplicates)
  if (GetSystemMetrics(SM_SWAPBUTTON) && vk in {1,2}) swap VK_LBUTTON/VK_RBUTTON;
  return vk ? (GetAsyncKeyState(vk) >> 15) & 1 : 0;
```
A string argument maps char -> Mac code through the table at Dirapi 0x6813E1A0 and then takes the same path (the
game only passes integers). `keyPressed` therefore needs (a) keyboard focus on the stage window and (b)
GetAsyncKeyState. Replacing **Iml32 0x6906D140** (`int f(int macCode)`, stdcall) with a scripted key state and
**Dirapi 0x6801D64C** with `return 1` (or all of 0x6801E13A, keeping its `ret 8`) makes real focus irrelevant.

Mac code -> Windows VK (from the table at Iml32 0x69086BD4):

| key | Mac | VK | | key | Mac | VK | | key | Mac | VK |
|---|---|---|---|---|---|---|---|---|---|---|
| Left | 123 | 0x25 | | A | 0 | 0x41 | | N | 45 | 0x4E |
| Right | 124 | 0x27 | | B | 11 | 0x42 | | O | 31 | 0x4F |
| Down | 125 | 0x28 | | C | 8 | 0x43 | | P | 35 | 0x50 |
| Up | 126 | 0x26 | | D | 2 | 0x44 | | Q | 12 | 0x51 |
| Space | 49 | 0x20 | | E | 14 | 0x45 | | R | 15 | 0x52 |
| Esc | 53 | 0x1B | | F | 3 | 0x46 | | S | 1 | 0x53 |
| Enter | 36 | 0x0D | | G | 5 | 0x47 | | T | 17 | 0x54 |
| Tab | 48 | 0x09 | | H | 4 | 0x48 | | U | 32 | 0x55 |
| 1 | 18 | 0x31 | | I | 34 | 0x49 | | V | 9 | 0x56 |
| 2 | 19 | 0x32 | | J | 38 | 0x4A | | W | 13 | 0x57 |
| 3 | 20 | 0x33 | | K | 40 | 0x4B | | X | 7 | 0x58 |
| 4 | 21 | 0x34 | | L | 37 | 0x4C | | Y | 16 | 0x59 |
| 5 | 23 | 0x35 | | M | 46 | 0x4D | | Z | 6 | 0x5A |
| 6 | 22 | 0x36 | | 7 | 26 | 0x37 | | 8 | 28 | 0x38 |
| 9 | 25 | 0x39 | | 0 | 29 | 0x30 | | Backspace | 51 | 0x08 |

The game's KeyManager polls exactly these 42 Mac codes on every busy-wait iteration (about 40k keyPressed calls per
second): 0-9, 11-23, 25, 26, 28, 29, 31, 32, 34, 35, 37, 38, 40, 45, 46, 49, 53, 123-126. Key *events*
(WM_KEYDOWN/WM_KEYUP/WM_CHAR) become Director keyDown/keyUp events through Iml32 Ordinal_1800 (VK -> Mac via the same
table), but the game's `on keyDown`/`keyUp` handlers are KeyAdapter methods called from its own KeyManager, so only
the keyPressed polling matters for gameplay.

### Mouse
There are two separate paths:
1. **Button events** (mouseDown/mouseUp on sprites, clickLoc) come from window messages. The stage window's WndProc
   (Proj FUN_10005020) calls Iml32 **Ordinal_1800 @0x69024A00** (`TranslateMsg(evt*, hwnd, msg, wParam, lParam)`).
   It first sets evt.x/y from GetMessagePos() -> ScreenToClient. For WM_LBUTTONDOWN (0x201 -> type 2), WM_LBUTTONUP
   (0x202 -> 1), DBLCLK (0x203 -> 3) and RBUTTON (0x204/0x205 -> 6/5) it then sets **x/y = lParam** (client
   coordinates = stage pixels; the window is not scaled). **WM_MOUSEMOVE (0x200 -> type 9) keeps the GetMessagePos()
   position (the real cursor) and ignores lParam.** Messages are pumped by Proj's loop (PeekMessage at Proj
   0x1000551A) and, during Lingo busy loops, by Dirapi's abort check FUN_6800F6D5 -> Proj callback FUN_10004F1F
   (PeekMessage/DispatchMessage). A posted click is therefore picked up inside the game's busy-wait and dispatched
   as a sprite event at Director's next event point.
2. **Position polling** (`the mouseLoc`/mouseH/mouseV, and rollover -> mouseEnter/mouseLeave/mouseWithin) goes
   through FUN_68034274 -> **FUN_680386AB(win, POINT* out)** (2 args, returns out):
   ```c
   if (!win || !win[0x28] /*hwnd*/ || !*(*(win+8)+0x388)) { out = (0,0); }
   else { Ordinal_1766(out);               // Iml32 0x69017450 = GetCursorPos
          Ordinal_1837(win[0x28], out); }  // Iml32 0x69027660 = ScreenToClient
   ```
   The flag `*(*(win+8)+0x388)` is set by the stage event handler FUN_68075129 on the first mouse-move event (type 9)
   and cleared by FUN_680191E6 (deactivate); until a WM_MOUSEMOVE arrives the mouseLoc is (0,0). Rollover tracking
   runs once per idle step: FUN_6800FE04 -> FUN_6800FF13 polls FUN_68034274, hit-tests sprites (FUN_68010234) and
   sends mouseEnter 8 / mouseLeave 9 / mouseWithin 10 via FUN_68010095. Replacing **FUN_680386AB** with one that
   writes a scripted stage position bypasses both the 0x388 flag and the real cursor; clicks are delivered with
   PostMessage(stageHwnd, WM_LBUTTONDOWN/UP, MK_LBUTTON/0, (y<<16)|x). A posted WM_MOUSEMOVE carries the real cursor
   via GetMessagePos unless Iml32 0x69017450 / user32 GetMessagePos are hooked too.

The game does not use `the mouseDown`/`stillDown`; it uses `the mouseLoc` in two select-screen beginSprite handlers,
plus sprite mouseEnter/mouseLeave/mouseUp/mouseDown handlers. Stage hwnd = `*(stageWin+4)` (section 4), window class
"ImlWinCls", title = movie name.

## 4. Frame loop, stage buffer, movie switch, `the frame`

### Who drives frames
Proj.dll `ProjectorMain` (export 1, 0x100052F4) -> message loop FUN_100054ED:
```c
for (;;) {
  if (PeekMessageA(&msg, 0, 0, 0, PM_REMOVE)) { if (msg == WM_QUIT) break; Translate/DispatchMessage; }
  else {
    sleepMs = 0;
    if (!Idle(&evt0, &sleepMs, 0))          // FUN_10002C8D -> FUN_10002ED9 (state 2 = playing)
      WaitMessage();
    else if (sleepMs > 2*timerRes) Sleep(sleepMs - 2*timerRes);   // timerRes from Iml32 Ordinal_1540
  }
}
```
FUN_10002ED9 (state 2) calls Dirapi **ordinal 78 = ServiceMovie @0x68007C8A**(player, 0, &sleepMs, 0, &outFlag,
nameBuf, 0x100) -> FUN_68008766 (ordinal 97, one movie step) -> FUN_6800FB97 (per-step idle: timeout check
FUN_68011339, idle event / rollover FUN_6800FE04) and, when the tempo time has come, the next score frame. Tempo:
FUN_68066707 reads the frame's tempo channel; frame duration (p+0xD8) = `(256000/tempo + frac) >> 8` ms. The game
calls `puppetTempo(999)` in prepareMovie, so Director wants a new frame every ~1 ms and the real frame rate is set
by the game's own Lingo busy-wait (below). There is no SetTimer in the frame path (Iml32's SetTimer users are
cursor/animation helpers).

### One tick (game.dcr, ~30 per second)
```
ServiceMovie (Proj 0x10002F86 -> Dirapi 0x68007C8A)
  FUN_6800F875(ctx, 11)                       idle event
  FUN_6800FA53                                exitFrame of the previous frame (FUN_6800F875(ctx, 0x10))
  FUN_680616D4 -> FUN_68066707(score)         enter the next score frame (reads the frame header, tempo)
  FUN_6800A468(ctx)                           prepareFrame: movie script (symbol 0x7A), then sprites (event 6)
      Lingo Global_Main.prepareFrame -> g.main.update()   <- busy-wait (below), then screen.update()
                                     -> g.main.paint()
  FUN_68061A21(score, ?)                      stage render + flush   <== "frame drawn"
      FUN_68060660(score, stageWin)           if stageWin[0xBC] (dirty): Iml32 Ordinal_1826(hwnd, 0,
                                              offscreenId, rects, n) -> SetDIBitsToDevice @Iml32 0x6903FDF0
  FUN_6800F875(ctx, 15)                       enterFrame
return to Proj
```
The game's busy-wait (`Class_Main.update`, called from prepareFrame):
```
repeat while 1
  audioMgr.update(); keyMgr.update()           -- 42 x keyPressed(code)  (0x680B4D5C -> 0x6801E13A)
  if (the milliSeconds - g.frameTimestamp) >= g.FRAME_DURATION_MIN then exit repeat   -- 1 x 0x6801ED97
end repeat
i = the milliSeconds; g.frameTimestamp = i     -- FRAME_DURATION_MIN = 1000 / FRAME_RATE = 33 (integer)
```
Under a virtual clock `the milliSeconds` must reach frameTimestamp + 33 inside this loop or it never exits.
Director's tempo scheduler also reads 0x6902D5C0 and needs time to advance by at least 1 ms between frames
(tempo 999), including the frames before the game's main object exists. Messages, including posted clicks, are pumped
inside the loop through FUN_6800F6D5 -> Proj FUN_10004F1F.

### "Frame drawn" and the stage buffer
**Dirapi FUN_68061A21** (stdcall, 2 args, `ret 8`; arg0 = score object `p`) returns when the stage of the current
tick is finished (and blitted if anything changed). It runs exactly once per frame for this game, because the game
never calls updateStage; its other callers (FUN_68061A3D/68061E69/68061F10) are updateStage/transition paths used
only by the CN tracker code. SetDIBitsToDevice is called only for dirty rects, and not at all when nothing changed.
The exact 600x400 stage is in Iml32's offscreen buffer:
```js
const stageWin = p.add(0x24).readPointer();
const id = stageWin.add(0x94).readS32();                   // offscreen id (4 for game.dcr)
const info = iml.add(0x8D590 + (id - 1) * 0x54).readPointer();   // Iml32 offscreen table 0x6908D590
// info: +0 height(400) +4 width(600) +8 rowBytes(2400) +0x10 bits +0x14 bpp(32)
const bits = info.add(0x10).readPointer();
// 32-bit BGRX, bottom-up rows (biHeight > 0): row y of the stage is at bits + (h-1-y)*rowBytes
```
hwnd = `stageWin.add(4).readPointer()`, dirty flag = `stageWin.add(0xBC)`. The stage window changes with the movie
(the wrapper's is 400x300), so it is read at every capture. Iml32 index helper: FUN_6903FE00(id) -> id-1 if
`[0x69095F50 + (id-1)*4]` != 0.

### Current frame (`the frame`)
`the frame` = FUN_68061922(score) = `*( *( *(score+0x28) ) + 0x70 )` (FUN_68051C72), i.e.
`p.add(0x28).readPointer().readPointer().add(0x70).readS32()`, with `p` from FUN_68061A21, FUN_68066707 or
FUN_68061922 (arg0). The score object `p` is the same object for `gamewrapper.dir` and `game.dcr`. Dirapi 0x681520F4
is the current-movie context stack top (pushed by FUN_68037F5F, popped by FUN_68038005); inside engine calls
`**0x681520F4 == p`. Frame sequence: wrapper frames 1, 1, 1, 2; `game.dcr` frame 1 (loading, ~440 ms), then 30..39
(title intro), then the 39/45 loops (`Frame_LoopHere` go(the frame) + `g.goFrame`).

### Movie switch (gamewrapper.dir -> game.dcr) and tick 1
The wrapper's frame-2 exitFrame runs Xtra helpers (`disableGoToNetPage`, `forceTheExitLock`,
`setTheRunMode("Plugin")`, from Xtras/LeechProtectionRemovalHelp.x32), `go(1, "game.dcr")`, then the 3D renderer
setup. Sequence (ms from spawn): CreateFileA("gamewrapper.dir") 96; wrapper enterNewFrame fr=1 at 132/152/152, fr=2
at 186; **CreateFileA("...\game.dcr") 222** (twice, msvcrt fopen); empty_*.cct 239-246; **enterNewFrame fr=1 at 273**
with `*(p+0x28)` changed (the score data handle of the new movie); prepareFrame 273; FUN_68061A21 282 (first
`game.dcr` stage, 600x400 offscreen). Tick 1 is the first FUN_68066707 (enter frame) after the first kernel32
CreateFileA whose path ends with `game.dcr` (equivalently, the first FUN_68066707 where `*(p+0x28)` differs from
the wrapper's value); tick N is captured at the N-th FUN_68061A21 return from then on. `game.dcr`'s prepareMovie
(Global_Main: clearGlobals, g = new Class_Globals, puppetTempo(999)) runs between the open and that first frame,
so the RNG seed is set at the `game.dcr` open.

## 5. Sprite channels

### Lingo sprite property getter
Lingo `the <prop> of sprite n` / `sprite(n).<prop>` ends in **FUN_68011EAB(ctx, n, propNum, out)** (get) /
FUN_680121EC (set), dispatched by FUN_68012F15(ctx, n, isSet, propNum, value*). `propNum` is the classic sprite
property number (1 type, 2 backColor, 3 bottom, 4 castNum, 7 foreColor, 8 height, 10 ink, 11 left, 13 locH, 14 locV,
0x12 puppet, 0x13 right, 0x16 stretch, 0x17 top, 0x18 trails, 0x19 visible, 0x1B width, 0x1C blend, 0x23 memberNum,
0x24 castLibNum, 0x29 tweened, ...). `puppetSprite` (symbol 0x1D7) is builtin FUN_6812E4EA -> FUN_680AA346(ctx, n,
0x12). Each case reads a field through **FUN_6802CE20(movie, 0, n, fieldCode, out)**, which locates two per-channel
records:

```c
H     = *(score + 0x28);                 // frame-state handle (also `the frame` = *(*H + 0x70))
D     = *H;                              // D+4 lock count, D+0x40 = channel count + 6, D+0x54 frame buffer
n     = FrameLock(H, &buf, 0) ;          // FUN_680513DD, stdcall: ++D[4] (locks D+0x50.. handles on 0->1),
                                         //   buf = D[0x54], returns D[0x40] - 6 (= 1000 here); FUN_68051427 unlocks
rec   = buf + 0x120 + (ch-1)*0x30;       // 48-byte BIG-ENDIAN score record of the current frame (6 main
                                         //   channels first): Lingo/puppet changes are written here
S     = *(score + 0x34) + (ch-1)*0x170;  // runtime channel struct (little-endian), *(score+0x2C) = count (150)
```
Score record (the layout of the file's VWSC sprite record, [DATA_FORMAT.md](DATA_FORMAT.md)): +0 type, +1 ink
(&0x3F; 0x40 trails, 0x80 stretch), +2 foreColor, +3 backColor, +4 u16 castLib, +6 u16 member, +8 u32 interval,
+0xC i16 locV, +0xE i16 locH, +0x10 height, +0x12 width, +0x14 colour flags, +0x15 blend byte (0 = opaque), +0x16
flags (0x10 blend enabled, 0x20 flipH, 0x40 flipV, 0x80 tweened, low nibble lineSize+1), +0x18..+0x1B fore/back G,B,
+0x1C i32 rotation*100, +0x20 i32 skew*100.

Channel struct S (0x170 bytes; the fields the getters and the renderer use):

| off | field |
|---|---|
| 0x00..0x17 | little-endian copy of the record (castLib, member, member ptr, interval, ink, ...) |
| 0x18, 0x1C | locH, locV (i32 copy) |
| 0x20..0x2C | sprite width/height, member width/height |
| 0x3C | back pointer to the score object |
| 0x40 | channel index (ch-1) |
| **0x44** | **locZ** (getter field 0x12; 0x48 holds a copy) |
| 0x4C | bit 0 = drawable (any member, visible or not; FUN_6806cc33) |
| **0x50** | bit 1 set = **invisible** (`visible` = `(~S[0x50] >> 1) & 1`); 0x54 holds a copy |
| 0x58 | bit 0x20: loc comes from S+0x70/0x74 instead of the record |
| 0x60 | member type of the current member |
| 0x68, 0x6C | member regPoint |
| 0x78..0x84 | rect(loc, loc + size) (unregistered) |
| **0xC8..0xD4** | **sprite rect** left, top, right, bottom = `sprite.rect` (bounding box of the quad below, so it includes rotation; for flipped sprites often 1 px larger than the exact rect because the quad coordinates are like 392.99999) |
| 0xD8..0x117 | quad: 4 points as doubles |
| 0x118 | non-zero: draw with the rect instead of the quad (section 7) |
| 0x12C | blit mode chosen by the renderer (FUN_6806E4DC from the ink: 0 copy, 2 bg-transparent, 10 blend, ...) |
| 0x130 | blend level 0..256 for the blitter: `(0xFF00 - raw*0x100)/0xFF` when blend is enabled, else 256 |

Getter formulas (FUN_6802CE20/FUN_68011EAB): member = record castLib/member; loc = record locH/locV (unless
S[0x58] & 0x20); rect = S+0xC8 (the getter then applies FUN_6806225B, a stage transform that does something only when
score+0x12C != 0); ink = rec[1] & 0x3F; **blend = 100 - (rec[0x15]*100 + 127) / 255** (integer division; Lingo
`blend = 30` stores 179 and reads back 30); locZ = S[0x44]; visible = !(S[0x50] & 2); flipH/flipV = rec[0x16] bits
5/6; rotation = be32(rec+0x1C) * 0.01; **puppet = byte D[0x9C + ch-1]** (FUN_68051F28; not in S).

### sprite.rect (S+0xC8) and the quad (S+0xD8)
Dirapi **FUN_6806d7bf** (per channel, when the frame's score data is loaded): rect = `rect(loc - reg, loc - reg +
size)` (reg scaled for stretched sprites), quad = that rect's corners (Iml32 Ordinal_1080: (L,T) (R,T) (R,B) (L,B)
as doubles). Only member types 1 (bitmap) and 0xD are transformed (flags from FUN_6806d760; film loops, text, fields
and shapes are not, so their rect ignores flips): angle1 = rotation*100, angle2 = skew*100; flipH adds 18000 to both,
flipV adds 18000 to angle2. Unless both are multiples of 36000, FUN_6806dbdd translates the quad by -loc,
FUN_6806dc29 applies `a = (angle1 % 36000) * K`, `ab = a + (angle2 % 36000) * K` (K = double pi/18000 at Dirapi
0x681334e8; msvcrt cos/sin = x87 FCOS/FSIN): `x' = x*cos(a) - y*sin(ab)`, `y' = y*cos(ab) + x*sin(a)`, translates
back, and Iml32 **Ordinal_1082** (0x69014D20) takes the bounding box: min/max of the corners, then per edge modf():
left/top = integer part, minus 1 if the fraction is non-zero and the integer part < 0; right/bottom = integer part,
plus 1 if the fraction is non-zero and the integer part >= 0. sin(pi) != 0, so flipped bitmaps get corners like
2.9999999999999218 / 41.000000000000014 and come out 1 px larger on some edges (a left of -1.7e-13 stays 0). The
port implements this bit for bit in `src/runtime/sprite.ts` (`Sprite.rect` / quadBounds; drawing uses the exact
`drawRect`).

S+0xC8 is refreshed when the frame's score data is loaded and when the stage is drawn, but only for channels that
hold a member (an emptied channel keeps its old rect), and when `sprite.rect` is set. Between those points a member
swap or loc change does not update it: a swap in an idle-time mouse handler reports the old member's rect until the
next frame, and a channel emptied with member(0) and filled again reports its previous member's rect. While the
stored rect is empty (the channel never had a member, or holds a 0x0 placeholder bitmap), reads see the live rect,
including its flip. The port implements this in `Sprite.rect` / `refreshRect`.

## 6. Score player rules

Implemented in `src/runtime/score.ts` and `sprite.ts`.

- **Mouse button events vs go().** Queued events are dispatched from FUN_68008766 after the player step
  (FUN_680080b2 -> FUN_680105c8; event ids 6 prepareFrame, 15 enterFrame, 16 exitFrame). Clicks posted between frames
  are queued. If the frame that just ended called no go(), the player step returns before entering the next frame
  and the queue is dispatched first: mouseDown/mouseUp run before the next frame's enterFrame/prepareFrame, and a
  go() from such a mouseUp is taken by the very next frame. If a go() is pending (any go, including
  `Frame_LoopHere`'s loop), the jump runs first and the events wait until after the new frame's enterFrame. Rollover
  (mouseEnter/mouseLeave) always comes from the idle-time cursor poll after enterFrame (FUN_6800FE04).
- **Behaviour instances appended to scriptInstanceList** get `me.spriteNum` = the sprite they are called for
  (`Class_ControlsPopUp`'s buttons swap members on hover); every sprite's scriptInstanceList receives the frame events.
- **puppet = 0 and the score buffer.** Lingo writes into the current frame's sprite records; a plain frame advance
  applies only the score's frame-to-frame changes, while a go() jump reloads the whole frame. A channel handed back
  with puppet = 0 after member(0) (`Class_SpriteManager`) therefore stays empty until the score changes it or a jump
  reloads it.
- **Film loops of invisible sprites do not advance** (the select screen's highlight loops, shown by updateSprites,
  start from their first frame).
- **Stretched bitmaps**: destination pixel d takes source pixel floor(d * src / dst) per axis.
- **Blend**: level = (0xFF00 - raw * 0x100) / 0xFF with the raw blend byte (score: `blendRaw`; Lingo `blend = p`
  stores floor(((100 - p) * 255 + 50) / 100)); pixel = dst + ((src - dst) * level >> 8) per channel. Film loop
  sub-sprites blend against the stage, not against the loop's own canvas.
- **2-bit bitmaps on a system palette** show their indices as 255/170/85/0 grey.
- **32-bit bitmaps with "use alpha" off** ignore their alpha channel (win_screen `endtext_score` has alpha 0
  everywhere and is shown, keyed by ink 36).

## 7. Stage update and Iml32 CopyBits

The renderer rules, implemented in `src/runtime/sprite.ts`. The harness's `--blit-trace` and `--region-trace`
([VERIFICATION.md](VERIFICATION.md)) log the calls named here.

- **Ink -> blit mode** (Dirapi FUN_6806E4DC, writes S+0x12C mode, +0x130 level): 0 copy -> 0, 36 -> 2, 7 -> 9,
  39 -> 0x16, 40 -> 0x1A, 41 -> 0x1C (40/41 stash the sprite colours at +0x138/+0x13C and set fore white / back
  black); any ink with blend level < 256 becomes mode 10 (blend) with flag 0x20, except mode 2 -> 0xC. Inks 8, 39, 7
  and 41-with-blend are drawn with the matte mask (1-bit, white connected to the edge, 4-neighbour flood fill) as
  Iml32's mask argument. Mode functions for a 32-bit stage (FUN_69003310): 9 = `dst |= src` (RGB, FUN_6900B2E0),
  0x16 = per-channel min (FUN_6900B9F0), 10 = blend. So **Darken (41) + blend** is a matte-masked blend and
  **Not Ghost (7)** a matte-masked OR.
- **Update region** (stage repaint): a list of rects, each repainted on its own (stage colour, then every sprite
  intersecting it, clipped to it); the rest of the stage keeps older pixels.
  * The list lives at stageWin+0x90 (+0x38 rects, +0x40 count). **FUN_6807577b(list, rect, slop)** adds one rect:
    empty rects are dropped; the rect is clipped to the stage (Ordinal_1066, dropped if empty); the first list rect
    that overlaps the clipped rect grown by `slop` on every side (strict overlap) gets the clipped rect unioned in
    (Ordinal_1067); every later list rect that overlaps the grown rect is unioned into that first one and removed
    (memmove), and because the loop index still advances, the rect that slides into the freed slot is not tested;
    with no overlap the clipped rect is appended. Before the render FUN_68060b69 appends the list to stageWin+0x20
    (no merging) and FUN_68060660 flushes it.
  * **FUN_6805bc75** syncs one channel: it compares the channel's current score record with its last applied copy
    (type, ink, colours, member, loc, size, flags, blend, rotation/skew; not the script field) plus the visible bit,
    locZ and member changes; if anything changed it adds the channel's stored rect S+0xC8 with slop 0
    (FUN_6806c6f8), recomputes the sprite (FUN_6806c8d9) and adds the new S+0xC8 with **slop 20** (FUN_6806c6b3;
    slop 0 while score+0x178 is set, i.e. a trails sprite was met in this pass).
  * When a frame is entered (FUN_680616d4 -> FUN_6805c1a3) every channel is synced in channel order.
  * A Lingo sprite property set (FUN_6802c3dc) writes the score record and syncs that channel at once only while the
    score's immediate flag score+0x16C is set: FUN_68065756 sets it around prepareFrame (FUN_6800a468), FUN_6805ba3c
    around beginSprite. Otherwise (exitFrame, enterFrame, mouse handlers) the change waits for the next frame's sync,
    so only the final state counts. `sprite.loc = p` is a locH set and a locV set, synced one after the other: a
    sprite given a member at (0, 0) and then moved adds three rects (at (0, 0), after locH, after locV).
  * A sprite with width 0 has the empty rect at its loc (no flip transform): `width = 0` on a flipped sprite at
    (315,320) gives rect(315,320,315,320). Width but no height keeps the horizontal extent (a 1x0 sprite at
    (267,520) has rect(267,520,268,520)).
  * Slop merges can join rects that are far apart: two separate rects 10 px apart merge when a third rect within
    20 px of both is added with slop 20.
  * The drawable bit S+0x4C & 1 is set for any channel with a member, visible or not: hidden sprites that change add
    their rects like visible ones, and a sprite that becomes hidden adds its old rect twice (FUN_6806c785 in
    FUN_6805bc75). A Lingo `visible` set that changes the value also adds the stored rect with slop 0 at once, after
    the set's own sync and in any context (FUN_6801199f -> FUN_6802e2d9 -> FUN_6806c785): a mouseEnter that shows a
    hidden sprite puts its rect first in the next update's list.
  * Film loops are synced through their own sub-score. The loop channel never adds its new rect (FUN_6806c6b3 skips
    channel kinds 4/5; its old rect is added when another property changes). When the loop appears (FUN_6808438a
    creates the sub-score) the sub-score's first frame pass runs before the stage transform is set, so each
    sub-sprite's rect is added in the loop's authoring coordinates with slop 20; then FUN_680620e0 sets the transform
    (loop rect -> channel rect) and, if the loop is or was away from its authoring position, adds every sub-sprite's
    old and new rect (slop 0); then every sub-sprite's stage rect is added again (slop 0). A moved loop does the same
    FUN_680620e0 step. After the main frame pass, each film loop that advanced runs its sub-score frame pass
    (FUN_680615d7 -> FUN_6805c1a3): sub-sprites whose record changed add old (0) / new (20) rects. Record changes are
    what FUN_6805bc75 flags (member, loc, ink/stretch, size only when stretched, blend, flips, rotation, colours), so
    a stored-size change of an unstretched sub-sprite adds nothing. `tell sprite to go(f)` runs the sub-score's pass
    for that jump at once.
  * Whole-stage invalidations: a palette switch at the stage update (FUN_68060b69 -> FUN_6805c880: the frame's
    palette differs from the stage window's +0x30; on a stage deeper than 8 bits -> FUN_68060c46) adds the stage rect
    after all channel rects. The palette in effect is the latest palette-channel entry at or before the frame whose
    palette resolves (system palette or palette member), else systemWin. `(the stage).bgColor = c` adds the stage
    rect at once, changed or not (FUN_68026848 -> FUN_68060c6b -> FUN_68075fa2; the CN billboard script).
- **Clip -> source rect** (FUN_69029DF0): dst is clipped to the stage and the update rect; the source loses
  `((clip edge - dst edge) * srcSize) / dstSize` (unsigned integer division) per clipped edge. An axis is scaled only
  when the clipped src and dst sizes differ; otherwise it is copied 1:1 from the clipped source origin (a 197x49 ->
  200x50 shadow cut by the stage bottom, dst rows 354..400, src rows 0..46, is copied row for row).
- **Mapping** (FUN_69004DF0 DDA set-up: step = src / dst, rem = src % dst, start error = ((clip - dst edge) * rem) %
  dst): destination pixel d reads floor(d * src / dst), independent of the clip.
- **Horizontal shrink** combines the span [floor(d*S/D), floor((d+1)*S/D)): indexed rows (FUN_69007060 1-bit,
  69007170 2-bit, 69007290 4-bit, 69007710 8-bit) keep the pixel with the lowest in-memory index, and 8-bit images
  are held with a reversed palette (in-memory = 255 - file index; 1-bit black = 0), so the highest file index wins.
  For 8-bit the fetch `LAB_690073B0` converts to 32-bit and averages the span per byte (FUN_69007500: n=2 -> >>1,
  else /n) unless local_18 is set (= the blit also shrinks vertically with mode 2/0xC or a mask, or it does not
  shrink horizontally). 32-bit: average, or the floor pixel when local_18 (FUN_69007930). Masks are stretched without
  combining (FUN_69006B60). Vertical shrink averages the rows of a span (FUN_690079E0/69007A20/69007A60) only for
  plain inks (no mode 2/0xC, no mask).
- **Flipped and rotated bitmaps: texture-mapped quad** (Dirapi FUN_68084b92: S+0x118 == 0 -> Iml32 Ordinal_1634 with
  the quad S+0xD8 and the whole member as source rect; otherwise Ordinal_1616 with S+0xC8). Ordinal_1634 ->
  FUN_6902ac00 -> FUN_69001bf0 with the quad (param 15): FUN_6900e8d0 sets up the polygon; when opposite sides'
  squared lengths agree within 0.95..1.05 (FUN_6900eeb0, always for a flipped/rotated rect) it takes the affine path
  (state word 1), otherwise a perspective path with doubles (unused by this game). Affine path:
  * corners: `X = ftol((x + 0.5) * 65536.0 + 0.5)`, same for y (16.16, truncated; coordinates clamped to +-32000);
    source corners (L,T) (R,T) (R,B) (L,B) << 16;
  * the first corner with the smallest Y is the top, the first with the largest Y the bottom; row = Ytop >> 16;
    edge A walks the corners forwards (+1), edge B backwards (FUN_6900da10): from corner i to j it covers
    n = (Yj - Yi + 0xffff) >> 16 rows (n <= 0: go on to the next corner, stop at the bottom corner), its source
    position steps by trunc((Sj - Si) / n) (FUN_6900dc20), x starts at Xi >> 16 and steps by Bresenham over
    dx = (Xj - Xi) >> 16 (dx < 0: error starts at 1 - n); FUN_6900dc90 steps one row;
  * rows before the clip top are stepped over; each row (FUN_6900dd30) spans [left x, right x) between the two edges
    (left = the edge with the smaller x; empty if equal or outside the clip); the source steps by
    du = trunc((uR - uL) / w), dv likewise; start u = uL + trunc(du / 2), except that an edge starting at corner 1 or
    2 uses the edge's own du when du = 0 and starts 0x8000 back when both are 0; v the same with corners 2/3; a left
    clip adds (du * k * 65536 + 0x8000) >> 16 (FUN_6900e8a0); the row is skipped if the (clipped) start sample is
    outside [0, R << 16) x [0, B << 16);
  * the fetch (FUN_6900d640 for 8-bit) takes source pixel (u >> 16, v >> 16) and adds du/dv per pixel: plain point
    sampling, no combining when shrinking. The mask (matte) is fetched the same way; inks and blend follow.
  Unscaled flips come out as exact mirrors; rotation-180 sprites take the same path.
- **Temp row overflow** (FUN_690037F0): the scaled source row buffer holds `floor(min(srcClipW, dstClipW) * 65536 /
  ratio) + 3` pixels, ratio = ceil(srcW * 65536 / dstW) (16 bit); the destination row buffer (the stage row being
  blended, FUN_69003B00) follows it in memory. A large upscale (the ending's 1 -> 600 px interlace: 598 pixels)
  writes past the end, so source pixel i >= cap is the destination buffer's pixel i - cap, already blended for a
  blend ink. The interlace's columns 598/599 therefore blend stage pixels 0/1 of the same row instead of black.

## 8. Numbers: floats and integer rects

**Float precision.** Lingo floats are doubles computed on the x87 FPU. The main thread's x87 control word during the
game is 0x027F (53-bit precision, round-to-nearest), so Lingo float arithmetic rounds like IEEE double, i.e. like
JavaScript numbers (the 3D Xtra does not switch the FPU to 24-bit).

**Rects hold integers.** `rect(point, point)` and rect arithmetic round: the rect/point list builder FUN_680D38CC and
the `rect()`/`point()` builtin FUN_680D47AB (symbols 0xBC/0xBD, arg specs "x4"/"x2") store integer datums in rects,
while points keep floats (float datums: type 0x20 = inline float32, type 0x23 = pointer to a double; 4 = integer).
Float -> integer is round half away from zero (FUN_680C5C17; ftol truncation only when ctx+0xD4 < 0). For example
`rect(viewCenter, viewCenter)` with viewCenter = point(-318.43, -160.0) is `rect(-318, -160, -318, -160)`, and
`viewOriginRect + that` is `rect(-618, -360, -18, 40)`. The fight camera therefore moves in whole pixels: sprite locs
equal round(worldX - integer viewUpperLeft). The port's `Rect` rounds every coordinate like `integer()`.
