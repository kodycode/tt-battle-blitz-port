// Director movie-level API used by the Lingo port: playhead, labels, timing, stage.
// The score player (score.ts) implements the playhead; this module is the stable surface ported code calls.
import { Rect } from './lingo';

export interface Playhead {
  frame(): number;
  go(target: number | string): void;
  label(name: string): number;
  marker(n: number): number;
  frameCount(): number;
}

let playhead: Playhead | null = null;
export function setPlayhead(p: Playhead): void {
  playhead = p;
}

// `the frame`
export function theFrame(): number {
  return playhead ? playhead.frame() : 1;
}

// go(frameNumber) / go("label"). Takes effect when the current frame's handlers finish.
export function go(target: number | string): void {
  playhead?.go(target);
}

// label("name") -> frame number, 0 if absent.
export function label(name: string): number {
  return playhead ? playhead.label(name) : 0;
}

// marker(0) = label at or before the current frame, marker(1) = next label, marker(-1) = previous.
// Returns the last frame + 1 past the final label... see score.ts for exact edge rules.
export function marker(n: number): number {
  return playhead ? playhead.marker(n) : 0;
}

// Game time. Stepped once per frame by the main loop so the game is deterministic under replay.
let clockMs = 0;
export function setClock(ms: number): void {
  clockMs = ms;
}
export function theMilliseconds(): number {
  return Math.floor(clockMs);
}
// Director: rint(float32(ms * 0.06)) — float32 product, rounded half to even (docs/DIRECTOR_INTERNALS.md).
export function theTicks(): number {
  const f = Math.fround(Math.fround(theMilliseconds()) * Math.fround(0.06));
  const r = Math.round(f);
  return Math.abs(f % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

export let stageWidth = 750;
export let stageHeight = 415;
export let stageBgColor = '#000000';
export function setStage(w: number, h: number, bg: string): void {
  stageWidth = w;
  stageHeight = h;
  stageBgColor = bg;
}

// (the stage).rect
export function stageRect(): Rect {
  return new Rect(0, 0, stageWidth, stageHeight);
}

// `the runMode`. The game shipped as a Shockwave plugin movie; its "Projector" branch never leaves the
// loading screen. The archived projector's gamewrapper.dir calls setTheRunMode("Plugin") before starting
// game.dcr, so the port reports "Plugin" too. Net preloads complete immediately (Class_NetPreloader).
export const runMode = 'Plugin';

// Sentinel a behaviour/frame-script handler returns where the Lingo called pass().
export const PASS = Symbol('pass');

// Base for score behaviours (BehaviorScript members). The score player sets spriteNum and the
// behaviour's initializer parameters as properties before calling beginSprite.
export class Behavior {
  spriteNum = 0;
  beginSprite?(): void;
  endSprite?(): void;
  prepareFrame?(): unknown;
  enterFrame?(): unknown;
  exitFrame?(): unknown;
  mouseDown?(): unknown;
  mouseUp?(): unknown;
  mouseEnter?(): unknown;
  mouseLeave?(): unknown;
  mouseWithin?(): unknown;
}
