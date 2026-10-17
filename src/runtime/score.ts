// Director score player: playhead, labels/markers, score sprites with behaviours, frame scripts, and
// the per-frame event order (endSprite, beginSprite, prepareFrame, [render], enterFrame, exitFrame).
// Data comes from public/data/score.json (format "tt-score/1", see docs/DATA_FORMAT.md).
import { member, Member, MEMBER_EMPTY } from './member';
import { sprite, allSprites, spriteHit, Sprite, advanceFilmLoops, scoreColor, DEFAULT_FORECOLOR, DEFAULT_BACKCOLOR, syncChannels, syncFilmLoops, withImmediateSpriteUpdates, setStagePalette } from './sprite';
import { PASS, Behavior, Playhead, setPlayhead } from './director';
import { mouse, setMouseHandler } from './input';
import type { ScoreProps } from './sprite';

type BehaviorRef = { castLib: number; member: number; name: string; params: Record<string, unknown> | null };
type SpriteState = {
  from: number;
  to: number;
  castLib: number;
  member: number;
  locH: number;
  locV: number;
  width: number;
  height: number;
  ink: number;
  blend: number;
  blendRaw?: number;
  flipH?: boolean;
  flipV?: boolean;
  rotation?: number;
  foreColor?: string | number;
  backColor?: string | number;
  stretch?: boolean;
};
type SpriteSpan = { channel: number; startFrame: number; endFrame: number; behaviors: BehaviorRef[]; states: SpriteState[] };
type FrameScriptSpan = { startFrame: number; endFrame: number; behaviors: BehaviorRef[] };

export type ScoreData = {
  stage: { width: number; height: number; bgColor: string };
  frameCount: number;
  labelList: { frame: number; name: string }[];
  frameScripts: FrameScriptSpan[];
  sprites: SpriteSpan[];
  palettes?: { startFrame: number; endFrame: number; castLib: number; member: number; name: string }[];
};

// Movie-script handlers (Global_Main): prepareFrame / exitFrame / prepareMovie / stopMovie.
export type MovieScript = { prepareMovie?(): void; prepareFrame?(): void; exitFrame?(): void; stopMovie?(): void };

export type BehaviorFactory = (name: string) => (new () => Behavior) | undefined;

type Active = { span: SpriteSpan; index: number; instances: any[] };

export class ScorePlayer implements Playhead {
  private data: ScoreData;
  private labels: { frame: number; name: string }[];
  private labelMap = new Map<string, number>();
  private byFrame: number[][] = []; // frame -> sprite span indices
  private frameScriptByFrame: number[] = []; // frame -> frame script span index (-1 none)
  private active = new Map<number, Active>(); // channel -> active span
  private frameScriptIndex = -1;
  private frameScriptInstances: any[] = [];
  private current = 0; // 0 before the first frame
  private pending: number | null = 1;
  private hovered: Sprite | null = null;
  private pressed: Sprite | null = null;
  private mouseQueue: { type: 'down' | 'up' | 'move'; x: number; y: number }[] = [];

  constructor(data: ScoreData, private movie: MovieScript, private factory: BehaviorFactory) {
    this.data = data;
    this.labels = data.labelList.slice().sort((a, b) => a.frame - b.frame);
    for (const l of this.labels) if (!this.labelMap.has(l.name.toLowerCase())) this.labelMap.set(l.name.toLowerCase(), l.frame);
    for (let f = 0; f <= data.frameCount; f++) {
      this.byFrame.push([]);
      this.frameScriptByFrame.push(-1);
    }
    data.sprites.forEach((s, i) => {
      for (let f = s.startFrame; f <= Math.min(s.endFrame, data.frameCount); f++) this.byFrame[f].push(i);
    });
    data.frameScripts.forEach((s, i) => {
      for (let f = s.startFrame; f <= Math.min(s.endFrame, data.frameCount); f++) this.frameScriptByFrame[f] = i;
    });
    setPlayhead(this);
    setMouseHandler((type, x, y) => this.mouseQueue.push({ type, x, y }));
  }

  // ---------------------------------------------------------------- Playhead

  frame(): number {
    return this.current;
  }

  frameCount(): number {
    return this.data.frameCount;
  }

  go(target: number | string): void {
    const f = typeof target === 'number' ? target : this.label(target);
    if (f >= 1) this.pending = Math.min(f, this.data.frameCount);
  }

  label(name: string): number {
    return this.labelMap.get(name.toLowerCase()) ?? 0;
  }

  // marker(0): label at or before the current frame; marker(n>0): n-th label after it; marker(-n): before marker(0).
  // Past the last label, marker(1) is frameCount + 1 so `the frame = marker(1) - 1` means "last frame".
  marker(n: number): number {
    const f = this.current;
    let at = -1;
    for (let i = 0; i < this.labels.length; i++) if (this.labels[i].frame <= f) at = i;
    const idx = at + n;
    if (n > 0 && idx >= this.labels.length) return this.data.frameCount + 1;
    if (idx < 0) return 0;
    return this.labels[Math.min(idx, this.labels.length - 1)].frame;
  }

  // ---------------------------------------------------------------- frame cycle

  // Enter the next frame and run prepareFrame. Call render after this, then endFrame().
  beginFrame(): void {
    // Mouse button/move events that arrived between frames: Director queues them and, when the playhead
    // simply advances to the next frame, dispatches them before it enters that frame; when a go() is pending
    // (any go during the last frame cycle, e.g. a Frame_LoopHere loop), the jump runs first and the events
    // wait for the new frame's idle time, after enterFrame (see endFrame). Verified with the projector
    // (Easy click on the intro: up on the tick after frame 149 -> handled before frame 150's update; up after
    // frame 150 looped -> handled after it; same on the win screen for frame 1063 -> 1064 vs 1064 -> 1030).
    // Only button events: rollover (mouseEnter/mouseLeave) comes from Director's idle-time polling of the
    // cursor position, after enterFrame (verified: hovering the intro's Easy button on a playing frame swaps the
    // member after that tick's stage is drawn).
    if (this.pending === null && this.current > 0) this.processMouseEvents(true);
    const target = this.pending ?? (this.current >= this.data.frameCount ? 1 : this.current + 1);
    const jumped = this.pending !== null;
    this.pending = null;
    this.enterFrame(target, jumped);
    advanceFilmLoops();
    // Film loops that advanced run their sub-score's sync pass (stage update list, sprite.ts syncFilmLoops).
    syncFilmLoops();
    // Lingo sprite changes made in prepareFrame reach the stage update list at once (sprite.ts syncChannel).
    withImmediateSpriteUpdates(() => this.dispatch('prepareFrame', () => this.movie.prepareFrame?.()));
  }

  endFrame(): void {
    this.dispatch('enterFrame');
    // Queued mouse events not handled before this frame (a go() was pending, see beginFrame) are dispatched
    // in the frame's idle time, after enterFrame and before exitFrame; then the rollover check.
    this.processMouse();
    this.mouseWithin();
    this.dispatch('exitFrame', () => this.movie.exitFrame?.());
  }

  private memberFor(castLib: number, num: number): Member {
    if (!num) return MEMBER_EMPTY;
    return member(num, castLib);
  }

  private stateAt(span: SpriteSpan, f: number): SpriteState | null {
    for (const s of span.states) if (f >= s.from && f <= s.to) return s;
    return span.states.length ? span.states[span.states.length - 1] : null;
  }

  private scoreProps(st: SpriteState): ScoreProps {
    return {
      member: this.memberFor(st.castLib, st.member),
      locH: st.locH,
      locV: st.locV,
      width: st.width,
      height: st.height,
      stretch: !!st.stretch,
      ink: st.ink,
      blend: st.blend,
      blendRaw: st.blendRaw ?? (st.blend >= 100 ? 0 : Math.floor(((100 - st.blend) * 255 + 50) / 100)),
      flipH: !!st.flipH,
      flipV: !!st.flipV,
      rotation: st.rotation ?? 0,
      foreColor: scoreColor(st.foreColor, DEFAULT_FORECOLOR),
      backColor: scoreColor(st.backColor, DEFAULT_BACKCOLOR),
    };
  }

  // prevSt: the channel's score state on the frame the playhead came from by a plain advance (null after a
  // go() jump or for a new span). Director keeps the current frame's sprite records in a buffer that Lingo
  // writes into; a plain advance applies only the score's frame-to-frame changes to it, a go() jump reloads the
  // whole frame. That only shows for a channel Lingo handed back with puppet = 0 (Class_SpriteManager sets
  // member(0) first): it stays empty until the score changes it or a jump reloads it (verified in the
  // projector's sprite dump: fighter_cinderblock ch65 is empty from tick 708 and back to the ">> reserved for
  // sprite manager" placeholder on 709, the next frame entered by go(); during the result screen's plain
  // frame advances from frame 850 it stays empty until the jump to frame 615).
  private applyState(spr: Sprite, st: SpriteState | null, newSpan: boolean, prevSt: SpriteState | null = null): void {
    if (!st || spr.puppet) return;
    if (spr.released && !newSpan && prevSt) {
      if (prevSt === st) return;
      const a = this.scoreProps(prevSt);
      const b = this.scoreProps(st);
      const changed = new Set<string>();
      if (a.member !== b.member) changed.add('member');
      if (a.locH !== b.locH || a.locV !== b.locV) changed.add('loc');
      if (a.width !== b.width || a.height !== b.height || a.stretch !== b.stretch) changed.add('size');
      if (a.ink !== b.ink) changed.add('ink');
      if (a.blend !== b.blend || a.blendRaw !== b.blendRaw) changed.add('blend');
      if (a.flipH !== b.flipH || a.flipV !== b.flipV) changed.add('flip');
      if (a.rotation !== b.rotation) changed.add('rotation');
      if (a.foreColor !== b.foreColor || a.backColor !== b.backColor) changed.add('color');
      spr.applyScoreDelta(b, changed);
      return;
    }
    spr.released = false;
    spr.applyScore(this.scoreProps(st), newSpan);
  }

  private instantiate(refs: BehaviorRef[], spriteNum: number): any[] {
    const out: any[] = [];
    for (const r of refs) {
      const C = this.factory(r.name);
      if (!C) continue;
      const inst: any = new C();
      inst.spriteNum = spriteNum;
      if (r.params) {
        for (const [k, v] of Object.entries(r.params)) inst[k] = typeof v === 'string' && v.startsWith('#') ? v.slice(1) : v;
      }
      out.push(inst);
    }
    return out;
  }

  private enterFrame(f: number, jumped = true): void {
    const prev = this.current;
    this.current = f;
    const nowSpans = new Map<number, number>();
    for (const i of this.byFrame[f] || []) nowSpans.set(this.data.sprites[i].channel, i);
    const fsIndex = this.frameScriptByFrame[f] ?? -1;

    // endSprite for spans that are not continuing into this frame.
    const ending: [number, Active][] = [];
    for (const [ch, a] of this.active) if (nowSpans.get(ch) !== a.index || prev === 0) ending.push([ch, a]);
    for (const [ch, a] of ending) {
      for (const inst of a.instances) inst.endSprite?.();
      this.active.delete(ch);
      const spr = sprite(ch);
      spr.scriptInstanceList = [];
      if (!spr.puppet) spr.clearScore();
    }
    if (this.frameScriptIndex !== fsIndex) {
      for (const inst of this.frameScriptInstances) inst.endSprite?.();
      this.frameScriptInstances = [];
    }

    // Apply score data; collect new spans.
    const beginning: Active[] = [];
    for (const [ch, i] of [...nowSpans].sort((a, b) => a[0] - b[0])) {
      const span = this.data.sprites[i];
      const spr = sprite(ch);
      const existing = this.active.get(ch);
      if (existing) {
        this.applyState(spr, this.stateAt(span, f), false, jumped ? null : this.stateAt(span, prev));
      } else {
        this.applyState(spr, this.stateAt(span, f), true);
        const a: Active = { span, index: i, instances: this.instantiate(span.behaviors, ch) };
        spr.scriptInstanceList = a.instances;
        this.active.set(ch, a);
        beginning.push(a);
      }
    }
    // The channels' rects are recomputed with the frame's score data (before beginSprite).
    for (const spr of allSprites()) if (spr.member !== MEMBER_EMPTY) spr.refreshRect();
    setStagePalette(this.effectivePalette(f));
    // Director's sync pass over all channels with the new frame's data (stage update list, sprite.ts), then
    // beginSprite, whose sprite changes are applied at once like prepareFrame's.
    syncChannels();
    withImmediateSpriteUpdates(() => {
      for (const a of beginning) for (const inst of a.instances) inst.beginSprite?.();
      if (this.frameScriptIndex !== fsIndex) {
        this.frameScriptIndex = fsIndex;
        this.frameScriptInstances = fsIndex >= 0 ? this.instantiate(this.data.frameScripts[fsIndex].behaviors, 0) : [];
        for (const inst of this.frameScriptInstances) inst.beginSprite?.();
      }
    });
  }

  // Sprite behaviours in channel order, then the frame script; the movie script only runs if the frame
  // script does not handle the event (or calls pass()).
  // Every sprite's scriptInstanceList gets the event, including instances Lingo appended itself.
  private dispatch(event: 'prepareFrame' | 'enterFrame' | 'exitFrame', movie?: () => void): void {
    for (const spr of allSprites()) {
      if (spr.spriteNum === 0 || spr.scriptInstanceList.length === 0) continue;
      this.send(spr, event);
    }
    let handled = false;
    for (const inst of this.frameScriptInstances) {
      if (typeof inst[event] === 'function') {
        const r = inst[event]();
        if (r !== PASS) handled = true;
      }
    }
    if (!handled && movie) movie();
  }

  // ---------------------------------------------------------------- mouse

  private spriteAt(x: number, y: number): Sprite | null {
    const list = allSprites().filter((s) => s.spriteNum > 0 && s.visible && (s.scoreActive || s.puppet) && s.member !== MEMBER_EMPTY);
    list.sort((a, b) => b.locZ - a.locZ || b.spriteNum - a.spriteNum);
    for (const s of list) if (spriteHit(s, x, y)) return s;
    return null;
  }

  // Director calls each instance in the sprite's scriptInstanceList with the sprite as context: `me.spriteNum`
  // is that sprite's channel even for an instance Lingo created with new(script) and appended to the list
  // without setting spriteNum (Class_ControlsPopUp's pop-up buttons; the original swaps their members on hover).
  private send(s: Sprite | null, event: string): void {
    if (!s) return;
    for (const inst of s.scriptInstanceList.slice()) {
      if (typeof inst[event] !== 'function') continue;
      inst.spriteNum = s.spriteNum;
      inst[event]();
    }
  }

  private processMouse(): void {
    const handled = this.processMouseEvents();
    // Sprites move under a still cursor: re-check the hover target every frame.
    if (handled === 0 && mouse.x >= 0) {
      const s = this.spriteAt(mouse.x, mouse.y);
      if (s !== this.hovered) {
        this.send(this.hovered, 'mouseLeave');
        this.hovered = s;
        this.send(s, 'mouseEnter');
      }
    }
  }

  // Dispatches the queued mouse events; returns how many there were. buttonsOnly: mouseDown/mouseUp only
  // (between frames; the cursor position is polled for rollover later, in endFrame).
  private processMouseEvents(buttonsOnly = false): number {
    const q = this.mouseQueue;
    this.mouseQueue = [];
    for (const e of q) {
      if (buttonsOnly && e.type === 'move') continue;
      const s = e.x < 0 ? null : this.spriteAt(e.x, e.y);
      if (!buttonsOnly && (e.type === 'move' || s !== this.hovered)) {
        if (s !== this.hovered) {
          this.send(this.hovered, 'mouseLeave');
          this.hovered = s;
          this.send(s, 'mouseEnter');
        }
      }
      if (e.type === 'down') {
        this.pressed = s;
        this.send(s, 'mouseDown');
      } else if (e.type === 'up') {
        if (s && s === this.pressed) this.send(s, 'mouseUp');
        this.pressed = null;
      }
    }
    return buttonsOnly ? 0 : q.length;
  }

  private mouseWithin(): void {
    if (this.hovered) this.send(this.hovered, 'mouseWithin');
  }

  // The palette in effect at frame f, as the stage update sees it (Dirapi FUN_68060b69 -> FUN_6805c880): the latest
  // palette channel entry at or before f whose palette resolves (a built-in palette or a cast member of type
  // palette), else the movie's default (systemWin). Observed with run_projector.py --region-trace on every switch
  // of four scenarios (frame 30 after frame 1: systemMac from frame 19; frame 545 after the select screen: the
  // versus palette of frame 541; frame 20 after the ending: systemMac), except that Director also falls back to
  // systemWin on frame 5 (Billboard), whose latest entry is robin_palette (frame 2); that switch coincides with a
  // whole-stage repaint ((the stage).bgColor) and never shows.
  private effectivePalette(f: number): string {
    let best: { startFrame: number; castLib: number; member: number } | null = null;
    for (const p of this.data.palettes || []) {
      if (p.startFrame > f || (best && p.startFrame < best.startFrame)) continue;
      if (p.castLib >= 0) {
        const m = this.memberFor(p.castLib, p.member);
        if (m.type !== 'palette') continue;
      }
      best = p;
    }
    return best ? `${best.castLib}.${best.member}` : '-1.-102';
  }

  // Palette channel entry for the current frame (8-bit art can depend on it).
  framePalette(): { castLib: number; member: number; name: string } | null {
    for (const p of this.data.palettes || []) if (this.current >= p.startFrame && this.current <= p.endFrame) return p;
    return null;
  }
}
