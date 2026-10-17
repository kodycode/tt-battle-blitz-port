// Boot: load the cast/score data exported from the original movie, then run the score at 30 fps.
import { CastLib, Member, MemberType, LImage, registerCastLib, member } from './runtime/member';
import { renderStage, setTextRenderer, setMemberLookup, allSprites, lastUpdateRegion } from './runtime/sprite';
import { ScorePlayer, ScoreData, MovieScript } from './runtime/score';
import { setClock, setStage, stageBgColor, theMilliseconds } from './runtime/director';
import { installInput, onFirstGesture, setCursorTarget, drainKeyTransitions, injectMouse, KeyTransition } from './runtime/input';
import { setFrameInput } from './runtime/busywait';
import { resumeAudio, loadSound, setAudioVirtualClock, setSoundLoader } from './runtime/audio';
import { setRandomSeed, getRandomSeed, rngTrace } from './runtime/lingo';
import { setGlobal, g } from './runtime/global';
import { Class_Globals } from './game/Class_Globals';
import { classes } from './game/classes';
import { installIntegerScaling } from './display';
import type { GameSource } from './data/source';
import { startup } from './data/startup';

const FRAME_MS = 1000 / 30;
const SPEED = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get('speed')) || 1));
// ?test=1: deterministic test mode (docs/VERIFICATION.md). No rAF loop, no start click, no real input;
// the harness drives ticks through window.__tt.test (see installTestMode below).
const TEST_MODE = new URLSearchParams(location.search).get('test') === '1';
// ?perf=1: record per-tick logic and render times in window.__tt.perf (performance measurements only).
const PERF = new URLSearchParams(location.search).get('perf') === '1';

// Score behaviour script names that are not valid identifiers map to their port's class name.
const BEHAVIOR_ALIASES: Record<string, string> = {
  'Billboard Script': 'CN_BillboardScript',
  'Launch Orbit Script': 'CN_LaunchOrbitScript',
  'Play-Game': 'CN_PlayGame',
};

const KNOWN_TYPES = new Set(['bitmap', 'sound', 'text', 'field', 'script', 'shape', 'palette', 'filmloop', 'flash']);

async function loadCasts(source: GameSource, progress: (done: number, total: number) => void): Promise<Member[]> {
  const data = await source.casts();
  const bitmaps: Member[] = [];
  const sounds: Member[] = [];
  for (const cl of data.castLibs) {
    const lib = new CastLib(cl.number, cl.name, cl.fileName ?? '');
    for (const j of cl.members) {
      const type = (KNOWN_TYPES.has(j.type) ? j.type : 'other') as MemberType;
      const m = new Member(j.number, cl.number, j.name ?? '', type);
      m.width = j.width ?? 0;
      m.height = j.height ?? 0;
      // Fields carry their box as `rect` instead of width/height (e.g. the HUD's FPS field is 100x16, which
      // is what Director reports as its sprite size/rect).
      if (j.width === undefined && Array.isArray(j.rect) && j.rect.length === 4) {
        m.width = Number(j.rect[2]) - Number(j.rect[0]);
        m.height = Number(j.rect[3]) - Number(j.rect[1]);
      }
      m.regPoint.locH = j.regX ?? 0;
      m.regPoint.locV = j.regY ?? 0;
      m.depth = j.bitDepth ?? 0;
      m.url = j.url ?? null;
      m.loop = !!j.loop;
      if (type === 'sound' && typeof j.sampleRate === 'number' && typeof j.sampleCount === 'number') {
        m.soundRegion = {
          sampleRate: j.sampleRate,
          sampleCount: j.sampleCount,
          skipSamples: Number(j.skipSamples ?? 0),
          mpegSamples: Number(j.mpegSamples ?? 0),
        };
      }
      if (typeof j.text === 'string') m.text = j.text;
      m.textInfo = j;
      if (j.filmLoop) m.filmLoop = j.filmLoop as any;
      if (typeof j.index0Color === 'string') {
        const hex = (j.index0Color as string).replace('#', '');
        m.keyColor = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
      lib.add(m);
      if (type === 'bitmap' && m.url) bitmaps.push(m);
      if (type === 'sound' && m.url) sounds.push(m);
    }
    registerCastLib(lib);
  }
  let done = 0;
  const total = bitmaps.length;
  const queue = bitmaps.slice();
  const worker = async () => {
    while (queue.length) {
      const m = queue.shift()!;
      const info = m.textInfo as Record<string, unknown>;
      // 32-bit bitmap with alpha but "use alpha" off: Director ignores the alpha channel.
      const ignoreAlpha = info.hasAlpha === true && info.useAlpha === false;
      const li = await source.bitmap(m.url!, ignoreAlpha);
      if (li) {
        const pal = info.palette as { system?: string } | undefined;
        if (!ignoreAlpha && m.depth === 2 && pal?.system) LImage.fixTwoBitSystemColors(li, pal.system);
        m.setLoadedImage(li);
      }
      progress(++done, total);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  return sounds;
}

function textRenderer(ctx: CanvasRenderingContext2D, s: { member: Member }, r: { left: number; top: number; width: number; height: number }): void {
  const m = s.member;
  const info = (m.textInfo ?? {}) as Record<string, any>;
  const size = info.fontSize ?? 12;
  ctx.fillStyle = info.color ?? '#ffffff';
  ctx.font = `${info.fontStyle?.includes?.('bold') ? 'bold ' : ''}${size}px ${info.font ?? 'Arial'}, sans-serif`;
  ctx.textBaseline = 'top';
  const align = info.alignment ?? 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const x = align === 'center' ? r.left + r.width / 2 : align === 'right' ? r.left + r.width : r.left;
  m.text.split(/\r\n|\r|\n/).forEach((line, i) => ctx.fillText(line, x, r.top + i * size * 1.2));
}

async function boot(source: GameSource): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const loading = document.getElementById('loading')!;
  const score: ScoreData = await source.score();
  setSoundLoader((url) => source.soundBytes(url));
  const W = score.stage.width;
  const H = score.stage.height;
  setStage(W, H, score.stage.bgColor || '#000000');
  canvas.width = W;
  canvas.height = H;
  installIntegerScaling(canvas, W, H);
  const ctx = canvas.getContext('2d')!;
  if (!TEST_MODE) installInput(canvas, W, H);
  setCursorTarget(canvas);
  setTextRenderer(textRenderer);
  setMemberLookup((castLib, num) => member(num, castLib));

  const sounds = await loadCasts(source, (d, t) => (loading.textContent = `Loading… ${Math.floor((100 * d) / t)}%`));
  if (TEST_MODE) {
    // Durations must be known up front: channel busy state is timed on the virtual clock.
    setAudioVirtualClock(theMilliseconds);
    await Promise.all(sounds.map((m) => loadSound(m)));
  } else {
    // Decode sounds in the background so first plays are instant.
    void (async () => {
      for (const m of sounds) await loadSound(m);
    })();
  }

  // Global_Main movie script.
  const movie: MovieScript = {
    prepareMovie() {
      const globals = new Class_Globals();
      setGlobal(globals);
      globals.init();
    },
    prepareFrame() {
      if (g && g.main) {
        g.main.update();
        g.main.paint();
      }
    },
    exitFrame() {
      if (g && g.main) g.main.branch();
    },
  };

  const factory = (name: string) => {
    const key = BEHAVIOR_ALIASES[name] ?? name;
    const C = (classes as Record<string, unknown>)[key];
    return typeof C === 'function' ? (C as any) : undefined;
  };

  let clock = 0;
  let player!: ScorePlayer;
  const startMovie = () => {
    clock = 0;
    setClock(clock);
    movie.prepareMovie!();
    player = new ScorePlayer(score, movie, factory);
  };
  if (!TEST_MODE) startMovie();
  // Introspection hook for the automated tests (tests/e2e).
  (window as any).__tt = {
    get player() {
      return player;
    },
    get g() {
      return g;
    },
    frames: 0,
    // Visible sprites with their member, rect, ink, locZ and behaviour names.
    sprites: () =>
      allSprites()
        .filter((s) => s.spriteNum > 0 && (s.scoreActive || s.puppet) && s.member.type !== 'empty')
        .map((s) => ({
          ch: s.spriteNum,
          member: `${s.member.castLibNum}:${s.member.number} ${s.member.name} (${s.member.type})`,
          rect: s.rect.toString(),
          ink: s.ink,
          locZ: s.locZ,
          visible: s.visible,
          puppet: s.puppet,
          loc: `${s.locH},${s.locV}`,
          blend: s.blend,
          flipH: s.flipH,
          flipV: s.flipV,
          rotation: s.rotation,
          behaviors: s.scriptInstanceList.map((b: any) => b.constructor.name),
        })),
  };

  // One score frame cycle; transitions(prevClock, clock) gives this frame's key transitions.
  const runTick = (transitions: (prevClock: number, clock: number) => KeyTransition[]) => {
    const prevClock = clock;
    clock += FRAME_MS;
    setFrameInput(transitions(prevClock, clock), clock);
    setClock(clock);
    if (PERF) {
      const t0 = performance.now();
      player.beginFrame();
      const t1 = performance.now();
      renderStage(ctx, W, H, stageBgColor);
      const t2 = performance.now();
      player.endFrame();
      const perf = ((window as any).__tt.perf ??= { logic: [] as number[], render: [] as number[], at: [] as number[] });
      perf.logic.push(t1 - t0 + (performance.now() - t2));
      perf.render.push(t2 - t1);
      perf.at.push(t0);
    } else {
      player.beginFrame();
      renderStage(ctx, W, H, stageBgColor);
      player.endFrame();
    }
    (window as any).__tt.frames++;
  };

  if (TEST_MODE) {
    installTestMode(canvas, (seed) => {
      setRandomSeed(seed);
      startMovie();
    }, runTick, () => clock);
    loading.remove();
    return;
  }

  let lastReal = performance.now();
  const step = (nowReal: number) => {
    runTick((prevClock, clock) => drainKeyTransitions(lastReal, nowReal, prevClock, clock));
    lastReal = nowReal;
  };

  // Audio needs a user gesture; the game waits on the title screen for a click anyway.
  loading.textContent = 'Click to start';
  await new Promise<void>((resolve) => onFirstGesture(resolve));
  resumeAudio();
  loading.remove();

  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    acc += Math.min(250, now - last);
    last = now;
    // Frames due in this callback get the key events up to their share of real time.
    // ?speed=N (testing only) runs N game frames per real frame slot.
    const due = Math.floor(acc / FRAME_MS);
    for (let k = 1; k < SPEED * due; k++) step(now - acc);
    for (let k = 1; k <= due; k++) {
      acc -= FRAME_MS;
      step(now - acc);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- deterministic test mode (?test=1)

type TestEvent =
  | { type: 'key'; key: string; down: boolean; subMs?: number }
  | { type: 'move' | 'down' | 'up'; x: number; y: number };

function installTestMode(
  canvas: HTMLCanvasElement,
  init: (seed: number) => void,
  runTick: (transitions: (prevClock: number, clock: number) => KeyTransition[]) => void,
  getClock: () => number,
): void {
  let started = false;
  let tick = 0;
  // ?rngtrace=1: record the caller stack of every random() call per tick (frames.json rngCalls).
  rngTrace.on = new URLSearchParams(location.search).get('rngtrace') === '1';
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
  const fighter = (f: any) => {
    if (!f) return null;
    try {
      return {
        x: num(f.pos?.locH),
        y: num(f.pos?.locV),
        currMove: num(f.currMove),
        health: num(f.health),
        state: num(f.state),
        dir: num(f.dir),
      };
    } catch {
      return null;
    }
  };
  // Per-tick state for frames.json. Defensive: anything missing is null.
  const state = () => {
    // rngState matches the projector harness's per-tick `rngState` (Director's randomSeed word, unsigned).
    const out: Record<string, unknown> = { tick, frame: (window as any).__tt.player?.frame() ?? null, ms: theMilliseconds(), rngState: getRandomSeed() >>> 0 };
    // The stage rects repainted this tick (Director's update region).
    out.region = lastUpdateRegion().map((r) => [r.left, r.top, r.right, r.bottom]);
    try {
      const main = g?.main;
      out.screen = num(main?.currScreenID);
      const scr = main?.screen;
      if (scr && (scr.player || scr.enemy)) {
        let clockTime: number | null = null;
        try {
          clockTime = num(scr.clock?.getTime?.());
        } catch {
          clockTime = null;
        }
        out.fight = {
          player: fighter(scr.player),
          enemy: fighter(scr.enemy),
          clock: clockTime,
          roundNum: num(scr.roundNum),
          roundState: num(scr.roundState),
        };
      }
    } catch {
      // leave what we have
    }
    return out;
  };
  const step = (events: TestEvent[] = []) => {
    if (!started) throw new Error('__tt.test.init(seed) first');
    const keys: KeyTransition[] = [];
    for (const e of events) {
      if (e.type === 'key') keys.push({ t: e.subMs ?? 0, code: e.key, down: !!e.down });
      else injectMouse(e.type, e.x, e.y);
    }
    tick++;
    runTick((prevClock, clock) =>
      keys
        .map((k) => ({ ...k, t: Math.min(clock, Math.max(prevClock, prevClock + k.t)) }))
        .sort((a, b) => a.t - b.t), // stable: same-time events keep array order
    );
    const st = state();
    if (rngTrace.on) st.rngCalls = rngTrace.log.splice(0);
    return st;
  };
  const capture = () => ({ png: canvas.toDataURL('image/png'), state: state() });
  (window as any).__tt.test = {
    ready: true,
    init(seed: number) {
      if (started) throw new Error('init() may only be called once per page load');
      started = true;
      init(seed);
    },
    step,
    capture,
    state,
    clock: getClock,
    // Runs several ticks; returns [{ state, png }] captured after each (fewer harness round trips).
    run(eventsPerTick: TestEvent[][], withPng = true) {
      return eventsPerTick.map((ev) => {
        const st = step(ev);
        return { state: st, png: withPng ? canvas.toDataURL('image/png') : null };
      });
    },
  };
}

void startup(boot);
