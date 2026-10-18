# Verifying the port against the original

The port is tested against the original game running in its own runtime. The same scripted session is played
by

- **the original**: `Projector.exe` (the Director MX 2004 10.1 player that ships with the release), driven
  deterministically under [Frida](https://frida.re) by `verification/harness/`, and
- **the port**: headless Chromium (Playwright) in the port's deterministic test mode, driven by
  `scripts/run_port.mjs`.

Both capture every frame plus their game state, and `verification/diff/` compares the captures tick by tick.
The original is the ground truth (the *oracle*): a difference is a bug in the port.

## Files

| Path | Contents |
|---|---|
| `verification/scenarios/<name>.json` | Scenarios (input scripts) |
| `verification/harness/` | `run_projector.py` (runs and captures the original), `agent.js` (the Frida agent it injects), `screens.py` (capture inspection) |
| `verification/diff/` | `diff.mjs` (pixels), `sprites_diff.mjs` (sprite state), `region_diff.mjs` (stage update regions), `sweep.mjs` (every scenario against the original) |
| `scripts/run_port.mjs` | Runs and captures the port |
| `scripts/authoring/` | Bots that write new scenarios by playing the port in closed loop |
| `local/run/ttbattleblitz/` | The original game folder the harness launches (git-ignored) |
| `local/captures/<scenario>/<side>/` | Captures (git-ignored) |

`local/run/ttbattleblitz/` is the release zip extracted as is (`ttbattleblitz.zip` contains a `ttbattleblitz/`
folder; extract it into `local/run/`). The harness never modifies these files: Frida patches the process in memory
only, and file opens inside the game folder are made read-only. The binaries are untrusted 2004 code; run them only
through the harness.

## Ticks

A *tick* is one Director score frame cycle of `game.dcr` (prepareFrame, stage draw, exitFrame). Tick 1 is the first
frame cycle of `game.dcr`: the projector first plays `gamewrapper.dir`, which then does `go(1, "game.dcr")`, and the
wrapper's frames are not counted. In the port, tick 1 is the first `beginFrame()`. Each capture is taken after the
stage has been drawn for that tick.

## Determinism contract

Both sides run under the same rules, so every run of a scenario is reproducible and the two sides are comparable:

- **Virtual clock.** `the milliSeconds` advances 1000/30 ms per tick (the game's own frame limiter targets 30 fps).
  A key event's timestamp is the tick start plus the event's `subMs`.
- **RNG.** Director's own `random()` algorithm ([DIRECTOR_INTERNALS.md](DIRECTOR_INTERNALS.md) section 1), seeded
  with the scenario's `seed` before tick 1. The port implements the identical algorithm.
- **Input.** Only scripted input reaches the game; the real keyboard and mouse are ignored.
- **Sound.** Audio output is disabled, so sound channels never report themselves busy because of real playback.

## Scenario format

```json
{
  "name": "menu_walkthrough",
  "seed": 12345,
  "ticks": 900,
  "events": [
    { "tick": 60,  "type": "move", "x": 300, "y": 381 },
    { "tick": 62,  "type": "down", "x": 300, "y": 381 },
    { "tick": 64,  "type": "up",   "x": 300, "y": 381 },
    { "tick": 400, "type": "key",  "key": "ArrowRight", "down": true,  "subMs": 5 },
    { "tick": 430, "type": "key",  "key": "ArrowRight", "down": false, "subMs": 5 }
  ]
}
```

- `key` uses browser `KeyboardEvent.code` names (`ArrowLeft`, `KeyZ`, `Escape`, `Space`, ...). The game reads Mac
  key codes: the port maps them in `src/runtime/input.ts`, the harness in `run_projector.py`.
- Mouse coordinates are stage pixels (600x400, origin at the stage's top-left corner).
- Events of one tick apply in array order, before that tick's prepareFrame. A click is usually move at t, down at
  t+2, up at t+4.

The scenarios cover the menus, the controls screen and pause popup, each of the ten fighters (menus, then every move
and special, then the AI plays the round out), summons, both time-up outcomes, the unlock chain, villain mode and
wins. `smoke_port_only.json` is for the port alone.

## Capture output

`local/captures/<scenario>/<side>/` (`<side>` is `projector` or `port` by default):

- `frames/000001.png` ... one 600x400 RGB PNG per tick.
- `frames.json`: `{ "side", "scenario", "seed", "ticks": [{ "tick", "frame", "ms", ... }] }`. `frame` is
  `the frame`, `ms` the virtual `the milliSeconds`. The projector adds `clock` and `rngState` (the RNG state after
  the tick); the port adds its own state (screen, RNG state, the stage update region).
- `sprites.json` (with `--sprites`): the sprite channel state after every tick, read exactly as Lingo's sprite
  getters see it: `{"<tick>": [{ch, member: "castLib:num name (type)", rect: "rect(l, t, r, b)", ink, locZ,
  visible, puppet, loc: "h,v", blend, flipH, flipV, rotation, behaviors}, ...]}`, one entry per channel that holds
  a member. On the projector side member names come from `public/data/casts.json` and `behaviors` is `null`.

Captures are never deleted: frames are overwritten in place, and if a folder already holds more frames than the run
will write, the run uses `<dir>_2`, `<dir>_3`, ... instead.

## Running

All commands run from the repository root. Prerequisites: `npm install` and `npm run setup` (the port and the
harness both read `public/data`), and for the original side Windows, the game folder in `local/run/ttbattleblitz/`,
and Python 3 with `frida` and `Pillow` (`pip install frida pillow`).

**Capture the original:**
```
python verification/harness/run_projector.py verification/scenarios/menu_walkthrough.json --sprites
```
Writes `local/captures/menu_walkthrough/projector/`. Options: `--out DIR`, `--ticks N` (override the scenario
length), `--show` (keep the window on screen; frames are identical either way, because capture reads Director's
offscreen stage buffer), `--sound`, `--timeout SEC`, `--wait-other SEC`, `--verbose`, `--diag-from TICK`,
`--blit-trace FROM:TO`, `--region-trace FROM:TO`, `--no-frames`. Only one `Projector.exe` can run at a time (a
second instance stalls after opening `game.dcr`), so the harness waits up to `--wait-other` seconds for others to
exit and then refuses. The process is killed when the harness ends, fails or is interrupted, and it sits in a Job
object with KILL_ON_JOB_CLOSE so it also dies if Python is killed.

**Capture the port:**
```
node scripts/run_port.mjs verification/scenarios/menu_walkthrough.json --sprites --batch 1
```
Writes `local/captures/menu_walkthrough/port/`. Options: `--out DIR`, `--batch N` (ticks per browser round trip;
`--batch 1` for a per-tick sprite dump), `--rgba`, `--rng-trace` (the caller stack of every `random()` call),
`--mem` (runs the in-memory data path on the static files), `--zip <ttbattleblitz.zip>` (boots from the zip through
the first-run screen). `--mem` and `--zip` must produce the same frames as the default.

**Compare pixels:**
```
node verification/diff/diff.mjs menu_walkthrough
node verification/diff/diff.mjs menu_walkthrough --a-dir <capture A> --b-dir <capture B> --out <dir> --pix 0 --tick-pct 0
```

All scenarios at once, each compared with the original at pixel tolerance 0 and on every tick's random state and
score frame (exit code 1 if any differs):
```
node verification/diff/sweep.mjs [--parallel N] [scenario ...]
```
Compares `projector` (A, reference) with `port` (B) tick by tick, auto-aligns a constant tick offset (none for a
correct port), reports the first divergent tick and writes `report.html` with side-by-side and difference images.
A pixel differs when a channel differs by more than `--pix` (default 24); a tick diverges when more than
`--tick-pct` percent of its pixels differ (default 0.5). `--pix 0 --tick-pct 0` is the exact test: any differing
pixel counts. Other options: `--a`/`--b` (side names), `--offset N`, `--search N`, `--align-ticks N`,
`--samples N`, `--amp N`.

**Compare sprite state:**
```
node verification/diff/sprites_diff.mjs local/captures/<name>/projector local/captures/<name>/port
```
Prints the first tick, channel and field that differ and every difference grouped into runs. Options: `--from N`,
`--to N`, `--offset N`, `--ch 11-15`, `--ignore rect,presence`, `--tol N`, `--max N`, `--json out.json`. Exit
code 0 means identical.

**Compare stage update regions:**
```
python verification/harness/run_projector.py verification/scenarios/<name>.json --region-trace 1:900 --no-frames
node verification/diff/region_diff.mjs local/captures/<name>/projector local/captures/<name>/port
```
Compares the list of rectangles Director repaints each tick with the port's `frames.json` regions.

**Inspect captures:**
```
python verification/harness/screens.py changes <capture dir> [--thr 0.3]
python verification/harness/screens.py sheet <capture dir> <out.png> <tick>...
python verification/harness/screens.py compare <capture dir A> <capture dir B>
```

## How the harness works

`run_projector.py` spawns `Projector.exe` suspended, injects `agent.js`, configures it and resumes. The agent
holds the game at the end of every tick until Python has stored the frame. Engine addresses are in
[DIRECTOR_INTERNALS.md](DIRECTOR_INTERNALS.md); the agent always uses `module base + RVA`.

### Tick boundaries
The Director player runs a state machine (`Dirapi+0x65528`, state at `player+0x58`). One `game.dcr` frame cycle is
`S1 S2 S6 S10 S11 S12 S14 S16 S17 S22 S27`: S1 = exitFrame of the previous frame, enter frame, prepareFrame (the
game's Lingo, including `Class_Main.update`'s busy-wait); S11 = stage render and blit (FUN_68061A21); S27 = tempo
wait. **A tick starts at S1 and ends at the first S27**; the capture happens there, synchronously. Tick 1 is the
first S1 after the main thread has opened `game.dcr`. The RNG is seeded (`SetRandomSeed(seed)`, Dirapi+0x9979) at
that open, before `game.dcr`'s prepareMovie, as in the port. `frame` in frames.json is `the frame`
(`*(*(*(score+0x28))+0x70)`).

### Virtual clock
Only main-thread calls from the game's modules (Projector.exe, Proj.dll, Dirapi, Iml32, Xtras) and msvcrt get
virtual time; worker threads, system DLLs and drivers get real time (they wait on real I/O or hardware, and
nothing they compute reaches the game). Hooked: `timeGetTime` (every Director clock goes through Iml32 0x6902D5C0
= `jmp [timeGetTime]`), `GetTickCount(64)`, `QueryPerformanceCounter`, `GetSystemTime(Precise)AsFileTime`;
`Sleep`/`WaitMessage` return at once on the main thread.

- Before tick 1 the clock starts at 100000 ms and advances 0.05 ms per read, n ms per `Sleep(n)` and 1 ms per
  `WaitMessage`. Nothing from this phase reaches the game except that it is earlier than the game epoch.
- During tick n the clock is **frozen at `1000000 + floor(n*1000/30)`** (set at S1, and at the previous S27 so
  Director's 1 ms tempo timer is satisfied). `ms` in frames.json is `floor(n*1000/30)`, the port's
  `the milliSeconds` at tick n. The game only uses differences, and the epoch is a multiple of 50 ms, so
  `the ticks` (`rint(float32(ms*0.06))`) also differs from the port by a constant (60000).
- The game's busy-wait (`repeat ... until the milliSeconds - frameTimestamp >= 33`) therefore passes on its first
  pass every tick, and the number of clock reads never affects the value read. To match the port's busy-wait, a
  tick with k key transitions makes the loop poll k+1 times: the harness recognises the check (the first
  `the milliSeconds` read after `keyPressed(126)`, the last of the 42 polled keys), fails it k times (returns the
  previous frameTimestamp) and applies the next transition before each new pass.
- Key-edge timestamps: `Class_KeyManager` reads `the milliSeconds` right after `keyPressed` reports an edge; that
  read returns `1000000 + floor(clamp((n-1)*1000/30 + subMs, prevClock, clock))`, the port's formula.
- Two Director throttles polled by I/O wait loops during the tick-1 cast load (Dirapi+0x385FC and +0x37DB4) get
  their own clock (+100 s per read) so they always fire; a frozen clock would starve them and a flowing one would
  leak real load time into the game.
- Hang breaker: if a tick makes more than 20000 clock reads, the clock starts creeping (0.0625 ms per read) and a
  warning names the hot read sites. A correct run never triggers it; a run that does is not trustworthy.

### Input
- **Keys.** Iml32 KeyPressedMac (`0x6906D140`, what Lingo `keyPressed` calls) is replaced by the scripted state per
  Mac key code, and the focus gate `Dirapi+0x1D64C` returns 1. `GetAsyncKeyState`/`GetKeyState`/
  `GetKeyboardState` report only scripted keys. Key events of tick n apply at S1 of tick n, before prepareFrame.
- **Mouse.** Events of tick n are delivered between ticks n-1 and n: at S27 of tick n-1 the harness posts
  `WM_MOUSEMOVE` (on a position change) and `WM_LBUTTONDOWN`/`UP` (lParam = stage coordinates) to the stage window
  and updates the polled position (`Dirapi+0x386AB` mouseLoc/rollover, `GetCursorPos`, `GetMessagePos`). Director
  polls the button through `KeyPressedMac(128)` (the Mac code of `VK_LBUTTON`) to detect the release, which also
  reports the scripted button. A click (down at t, up at t+2) produces mouseUp in tick t+2; rollover (mouseEnter)
  is processed in the idle step after the render, so it shows one tick after the move.
- Real keyboard and mouse messages for the main thread are dropped; only messages the harness posts pass.

### Sound
By default `DirectSoundCreate*` and `waveOutOpen` fail, so `sound(n).isBusy()` is always false and
`Class_AudioManager`'s channel bookkeeping does not depend on real playback. `--sound` keeps audio.

### Traces
- `--blit-trace FROM:TO` logs every Iml32 blit of those ticks to `<out>/agent_diag.txt`: Ordinal_1616/1634 entries
  with their Dirapi caller, and one `BLIT` line per FUN_69001BF0 call (destination/source size and depth, unclipped
  and clipped rects, mask, the blit mode struct S+0x12C.., colours, quad flag; `B1634` lines for quad blits carry the
  four corners as doubles). It also logs how the update list is built: `CH ch=N slop=S` (FUN_6806c671, a channel's
  rect invalidated), `ADD rect=... slop=S` + `upd` (FUN_6807577b and the list after it), `APPEND` (the list handed
  to the stage window) and `REGION` (the list flushed by FUN_68060660). A few MB per 1000 fight ticks.
- `--region-trace FROM:TO` logs only the `REGION t=N dirty=D n:[l,t,r,b]...` lines (Director's update region per
  tick) and `PALETTE` lines for palette switches at render time (each repaints the whole stage).
- `--sprites` reads the sprite channels at the capture point with the getter formulas of
  [DIRECTOR_INTERNALS.md](DIRECTOR_INTERNALS.md) section 5. `rect` is Director's bounding box of the transformed
  sprite (it includes rotation and is often 1 px larger for flipped sprites), exactly as the port reports it.

### Threading
Operating-system functions that any thread may call are replaced by small C gates (Frida CModule), so worker
threads never enter JavaScript; calling into JavaScript from arbitrary threads, or enumerating modules from hooks,
deadlocks the process. `Process.enumerateModules()` misses Dirapi, Iml32 and the Xtras in this process, so game
modules are also looked up by file name.
