// Sprite channels and the stage renderer.
import { Point, Rect, integer } from './lingo';
import { Member, MEMBER_EMPTY, LImage } from './member';

export const CHANNEL_COUNT = 150;

// Inks used by the game: 0 copy, 8 matte, 36 background transparent, 39 darkest. Others fall back to copy.
export const INK_COPY = 0;
export const INK_MATTE = 8;
export const INK_BGTRANSPARENT = 36;
export const INK_DARKEST = 39;
export const INK_DARKEN = 41;
export const INK_NOTGHOST = 7;

export type ScoreProps = {
  rotation: number;
  member: Member;
  locH: number;
  locV: number;
  width: number;
  height: number;
  ink: number;
  blend: number;
  blendRaw: number; // raw blend byte from the score (0 = 100% .. 255 = 0%)
  flipH: boolean;
  flipV: boolean;
  foreColor: string;
  backColor: string;
  stretch: boolean; // score stretch flag; width/height are the raw stored sprite size
};

// Float -> integer coercion for sprite loc/size properties (Lingo integer(): round half away from zero).
const spriteInt = (v: number): number => integer(Number(v) || 0);

// Score colour value -> CSS colour. Strings are "#rrggbb"; a plain integer is a palette index
// (only 0 = white and 255 = black occur in this movie; Director's defaults are fore 255, back 0).
export function scoreColor(v: unknown, dflt: string): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    if (v === 0) return '#ffffff';
    if (v === 255) return '#000000';
    const g = (255 - (v & 255)).toString(16).padStart(2, '0');
    return `#${g}${g}${g}`;
  }
  return dflt;
}
export const DEFAULT_FORECOLOR = '#000000';
export const DEFAULT_BACKCOLOR = '#ffffff';

// Size a score sprite is drawn at. Director only uses the stored sprite width/height when the sprite is
// stretched (ink byte bit 0x80); otherwise bitmaps and film loops are drawn at the member's own size and
// the stored size is stale authoring data (verified against the original: intro_cyborg is stored as
// 1252x771 and intro_text_01 as 480x96 but both draw at natural size; same rule as ScummVM's Director).
// Shapes have no intrinsic image, so they always use the stored size.
export function scoreSpriteSize(m: Member, st: { width: number; height: number; stretch?: boolean }): [number, number] {
  const intrinsic = m.type === 'bitmap' || m.type === 'filmloop';
  if (intrinsic && !st.stretch) return [m.width, m.height];
  return [st.width || m.width, st.height || m.height];
}

// ---------------------------------------------------------------- Director's sprite quad (sprite.rect)

// x87 FSIN/FCOS: the argument is reduced with the FPU's 66-bit pi, not the true pi. Near multiples of pi
// (flips use exactly those angles) this changes the low bits of the result, so reduce the same way:
// x - k * pi66/2 in three exact-product pieces (Cody-Waite), then sin/cos of the small remainder.
// pi66 = 0x3.243F6A8885A308D3 (pi rounded to 66 significant bits).
const PI66_HALF_NUM = 0x3243f6a8885a308d3n; // pi66/2 = this / 2^65
const PI66_HALF_1 = Number(PI66_HALF_NUM >> 40n) / 2 ** 25; // top 26 bits
const PI66_HALF_2 = Number((PI66_HALF_NUM >> 14n) & 0x3ffffffn) / 2 ** 51; // next 26 bits
const PI66_HALF_3 = Number(PI66_HALF_NUM & 0x3fffn) / 2 ** 65; // last 14 bits
function x87SinCos(x: number): [number, number] {
  const k = Math.round(x / (Math.PI / 2));
  const r = x - k * PI66_HALF_1 - k * PI66_HALF_2 - k * PI66_HALF_3;
  const s = Math.sin(r);
  const c = Math.cos(r);
  switch (((k % 4) + 4) % 4) {
    case 0:
      return [s, c];
    case 1:
      return [c, -s];
    case 2:
      return [-s, -c];
    default:
      return [-c, s];
  }
}

// Bounding box of a sprite's transformed quad, exactly as Director computes it: Dirapi FUN_6806dbdd /
// FUN_6806dc29 (rotate + skew around the reg point, angles in 1/100 degree times the double pi/18000 at
// Dirapi 0x681334e8, msvcrt sin/cos), then Iml32 Ordinal_1082 (min/max of the 4 corners; each edge is
// modf()'s integer part, moved out by 1 when the fraction is non-zero, but only for left/top < 0 and for
// right/bottom >= 0, so a left of -1e-13 stays 0).
const ANGLE_K = 0.00017453292519943294;
// The sprite's quad (channel struct S+0xD8): the corners (L,T) (R,T) (R,B) (L,B) of the unregistered rect,
// transformed around the loc; [x0, y0, x1, y1, x2, y2, x3, y3] as doubles (verified against the quads Dirapi
// hands Iml32's Ordinal_1634, e.g. the flipped Starfire glow 460.9999999999999,-6.000000000000043, ...).
function quadCorners(r: Rect, cx: number, cy: number, rot100: number, skew100: number): number[] {
  const a = (rot100 % 36000) * ANGLE_K;
  const ab = a + (skew100 % 36000) * ANGLE_K;
  const [sa, ca] = x87SinCos(a);
  const [sab, cab] = x87SinCos(ab);
  const out: number[] = [];
  for (const [px, py] of [
    [r.left, r.top],
    [r.right, r.top],
    [r.right, r.bottom],
    [r.left, r.bottom],
  ]) {
    const x = px + -cx;
    const y = py + -cy;
    out.push(x * ca - y * sab + cx, y * cab + x * sa + cy);
  }
  return out;
}
function quadBounds(r: Rect, cx: number, cy: number, rot100: number, skew100: number): Rect {
  const q = quadCorners(r, cx, cy, rot100, skew100);
  let minX = 2147483647.0, minY = 2147483647.0, maxX = -2147483648.0, maxY = -2147483648.0;
  for (let i = 0; i < 8; i += 2) {
    const qx = q[i];
    const qy = q[i + 1];
    if (qx < minX) minX = qx;
    if (maxX < qx) maxX = qx;
    if (qy < minY) minY = qy;
    if (maxY < qy) maxY = qy;
  }
  const lo = (v: number) => {
    const i = Math.trunc(v) | 0;
    return v !== Math.trunc(v) && i < 0 ? i - 1 : i;
  };
  const hi = (v: number) => {
    const i = Math.trunc(v) | 0;
    return v !== Math.trunc(v) && i >= 0 ? i + 1 : i;
  };
  return new Rect(lo(minX), lo(minY), hi(maxX), hi(maxY));
}

// > 0 while Director applies Lingo sprite property sets to the stage at once (prepareFrame, beginSprite; see
// syncChannel). Declared before the channels are created (their constructors run the setters).
let immediateDepth = 0;

export class Sprite {
  readonly spriteNum: number;
  private _member: Member = MEMBER_EMPTY;
  private _locH = 0;
  private _locV = 0;
  private _width = 0;
  private _height = 0;
  private _stretched = false;
  locZ: number;
  ink = 0;
  blend = 100;
  // The blend byte the renderer uses (0 = opaque .. 255 = invisible); `blend` is the percentage Lingo sees.
  blendRaw = 0;
  visible = true;
  flipH = false;
  flipV = false;
  rotation = 0; // degrees, clockwise, around the reg point
  foreColor = DEFAULT_FORECOLOR; // shapes fill with it; 1-bit bitmaps are tinted with it
  backColor = DEFAULT_BACKCOLOR;
  private _puppet = false;
  // Turning puppet off hands the channel back to the score, but the channel keeps what Lingo left in it until
  // the score changes it on a plain frame advance or a go() jump reloads the frame (see
  // ScorePlayer.applyState; Class_SpriteManager's released channels stay empty until then).
  get puppet(): boolean {
    return this._puppet;
  }
  set puppet(v: boolean) {
    if (this._puppet && !v) {
      this.overridden.clear();
      this.released = true;
    }
    this._puppet = v;
  }
  // Handed back to the score by puppet = 0 and not reloaded since: plain frame advances only apply the score's
  // changes (see ScorePlayer.applyState).
  released = false;
  // Set while the score supplies this channel; Lingo-set properties override it for the rest of the span.
  scoreActive = false;
  overridden = new Set<string>();
  // Behaviour instances attached by the score for the current span.
  scriptInstanceList: any[] = [];
  spanKey = '';
  // Film loop playback position (1-based) for film loop members; restarts when the member changes.
  loopFrame = 1;
  loopShown = false;

  // `tell sprite(n) to go(f)`: move the sprite's film loop to frame f. The loop's playhead is moved
  // immediately, so the next score frame step advances it again before drawing (verified against the
  // original: a mouseEnter go(1) in tick 30's idle shows loop frame 2 on tick 31, 3 on tick 32).
  tellGo(f: number): void {
    this.loopFrame = Math.max(1, f);
    this.loopShown = true;
    // The loop's sub-score enters that frame at once (its own sync pass, before the next frame's advance).
    syncFilmLoop(this);
  }

  private memberChanged(prev: Member): void {
    if (prev !== this._member) {
      this.loopFrame = 1;
      this.loopShown = false;
    }
  }

  constructor(n: number) {
    this.spriteNum = n;
    this.locZ = n;
  }

  private touch(prop: string): void {
    if (this.scoreActive) this.overridden.add(prop);
  }

  get member(): Member {
    return this._member;
  }
  set member(m: Member) {
    if (this.spriteNum === 0) return;
    this.touch('member');
    const prev = this._member;
    this._member = m || MEMBER_EMPTY;
    this.memberChanged(prev);
    // Assigning a member resets an unstretched sprite to the member's natural size.
    if (!this._stretched || this._width === 0 || this._height === 0) {
      this._width = this._member.width;
      this._height = this._member.height;
      this._stretched = false;
    }
    spriteSet(this);
  }

  get loc(): Point {
    return new Point(this._locH, this._locV);
  }
  // Sprite locs are integers in Director: a float is coerced like Lingo integer() (round half away from
  // zero), so sprites always land on whole stage pixels (verified on the fight camera: x.5 locs round up;
  // truncation shifts the whole screen by 1 px on those ticks).
  set loc(p: Point) {
    if (this.spriteNum === 0) return;
    this.touch('loc');
    // Director applies `sprite.loc = p` as a locH set followed by a locV set, each synced on its own (the stage
    // update list gets the intermediate rect: fighter_plasmus t691, a sprite-manager channel moved from (0, 0)).
    this._locH = spriteInt(p.locH);
    spriteSet(this);
    this._locV = spriteInt(p.locV);
    spriteSet(this);
  }
  get locH(): number {
    return this._locH;
  }
  set locH(v: number) {
    if (this.spriteNum === 0) return;
    this.touch('loc');
    this._locH = spriteInt(v);
    spriteSet(this);
  }
  get locV(): number {
    return this._locV;
  }
  set locV(v: number) {
    if (this.spriteNum === 0) return;
    this.touch('loc');
    this._locV = spriteInt(v);
    spriteSet(this);
  }

  get width(): number {
    return this._width;
  }
  set width(v: number) {
    if (this.spriteNum === 0) return;
    this.touch('size');
    this._width = spriteInt(v);
    this._stretched = v !== this._member.width || this._height !== this._member.height;
    spriteSet(this);
  }
  get height(): number {
    return this._height;
  }
  set height(v: number) {
    if (this.spriteNum === 0) return;
    this.touch('size');
    this._height = spriteInt(v);
    this._stretched = this._width !== this._member.width || v !== this._member.height;
    spriteSet(this);
  }

  // Exact on-stage box the sprite is drawn into (reg point at loc, scaled with the sprite, mirrored for
  // flips). Used by the renderer and hit testing; Lingo's `sprite.rect` is `rect` below.
  get drawRect(): Rect {
    const m = this._member;
    const sx = m.width ? this._width / m.width : 1;
    const sy = m.height ? this._height / m.height : 1;
    let left = this._locH - m.regPoint.locH * sx;
    let top = this._locV - m.regPoint.locV * sy;
    if (this.flipH) left = this._locH - (m.width - m.regPoint.locH) * sx;
    if (this.flipV) top = this._locV - (m.height - m.regPoint.locV) * sy;
    // The stage rect is in whole pixels (only differs from the exact value for stretched sprites).
    left = Math.round(left);
    top = Math.round(top);
    return new Rect(left, top, left + this._width, top + this._height);
  }

  // Lingo `sprite.rect`, as Director computes it (Dirapi FUN_6806d7bf, channel struct +0xC8): the
  // unregistered rect(loc - reg, loc - reg + size); for a bitmap with a flip or rotation, the bounding box of
  // that rect's quad after Director's rotation/skew transform (flipH = rotation and skew + 180 degrees,
  // flipV = skew + 180). The transform's sin/cos rounding leaves corners like 392.99999999999994 or
  // 41.000000000000014, so flipped sprites often come out 1 px larger than the drawn box (see quadBounds).
  // Other member types (film loops, text, fields, shapes) never get the transform: their rect ignores flips.
  // Director stores this rect in the channel and recomputes it when the frame's score data is loaded and when
  // the stage is drawn, not on every Lingo property change: after a member swap in an idle-time mouse handler
  // (e.g. a mouseEnter after the stage was drawn) `sprite.rect` still reports the old member's rect until the
  // next frame (verified in the projector's sprite dump: menu_walkthrough tick 48, loop_intro_next_button
  // reports intro_next_border's rect; unlock_chain_3 tick 397, the select screen's mouseDown member swaps).
  // While the stored rect is empty (a channel that never had a member, or a 0x0 placeholder bitmap), reads see
  // the live rect: the select screen's tag sprites report their new member's rect on the tick a mouse handler
  // fills a never-used channel, and the Starfire summon glow, put on a released sprite-manager channel (score
  // placeholder) and read back with sprite.rect in the same update, has its real (flipped) rect. A channel
  // emptied with member(0) keeps its old rect (fighter_cinderblock t312, unlock_chain_3 t397).
  get rect(): Rect {
    const c = this.rectCache;
    return (c && c.width !== 0 && c.height !== 0 ? c : this.computeRect()).duplicate();
  }
  private rectCache: Rect | null = null;
  refreshRect(): void {
    this.rectCache = this.computeRect();
  }
  // The live channel rect (Director's S+0xC8 as the stage update computes it), used for the update region.
  stageRect(): Rect {
    return this.computeRect();
  }
  private computeRect(): Rect {
    // A sprite with no width has the empty rect at its loc (Director's channel rect after
    // Class_SpriteManager.initSprite's `width = 0`: rect(315, 320, 315, 320) for a flipped sprite at loc
    // (315, 320), fighter_plasmus t1309; the flip transform is not applied). With a width but no height it keeps
    // its horizontal extent (timeup_ahead t2171: FX_shadow 1x0 at (267, 520) reads rect(267, 520, 268, 520)).
    if (this._width === 0) return new Rect(this._locH, this._locV, this._locH, this._locV);
    const base = this.baseRect();
    if (this._height === 0) return base;
    const t = this.transform();
    return t ? quadBounds(base, this._locH, this._locV, t[0], t[1]) : base;
  }
  // The unregistered rect rect(loc - reg, loc - reg + size), reg scaled with the sprite.
  private baseRect(): Rect {
    const m = this._member;
    const sx = m.width ? this._width / m.width : 1;
    const sy = m.height ? this._height / m.height : 1;
    const left = Math.round(this._locH - m.regPoint.locH * sx);
    const top = Math.round(this._locV - m.regPoint.locV * sy);
    return new Rect(left, top, left + this._width, top + this._height);
  }
  // [rotation, skew] in 1/100 degree for a transformed bitmap (flipH = both + 180, flipV = skew + 180), or null
  // when Director draws it untransformed (S+0x118 set: plain CopyBits).
  private transform(): [number, number] | null {
    if (this._member.type !== 'bitmap') return null;
    let rot = Math.round((Number(this.rotation) || 0) * 100);
    let skew = 0;
    if (this.flipH) {
      rot += 18000;
      skew += 18000;
    }
    if (this.flipV) skew += 18000;
    if (rot % 36000 === 0 && skew % 36000 === 0) return null;
    return [rot, skew];
  }
  // Director's quad for a transformed bitmap (S+0xD8, drawn through Iml32's texture mapper), or null.
  quad(): number[] | null {
    if (this._width === 0 || this._height === 0) return null;
    const t = this.transform();
    return t ? quadCorners(this.baseRect(), this._locH, this._locV, t[0], t[1]) : null;
  }
  set rect(r: Rect) {
    if (this.spriteNum === 0) return;
    const m = this._member;
    this.touch('size');
    this.touch('loc');
    this._width = spriteInt(r.width);
    this._height = spriteInt(r.height);
    this._stretched = true;
    const sx = m.width ? this._width / m.width : 1;
    const sy = m.height ? this._height / m.height : 1;
    this._locH = spriteInt(r.left + m.regPoint.locH * sx);
    this._locV = spriteInt(r.top + m.regPoint.locV * sy);
    this.refreshRect();
    spriteSet(this);
  }

  // Called by the score player with this frame's score data for a non-puppet channel.
  applyScore(p: ScoreProps, newSpan: boolean): void {
    this.scoreActive = false;
    if (newSpan) {
      this.overridden.clear();
      this.locZ = this.spriteNum;
    }
    const o = this.overridden;
    if (!o.has('member')) {
      const prev = this._member;
      this._member = p.member;
      this.memberChanged(prev);
    }
    if (!o.has('loc')) {
      this._locH = p.locH;
      this._locV = p.locV;
    }
    if (!o.has('size')) {
      // Size follows the member actually shown (which Lingo may have swapped) unless stretched.
      const [w, h] = scoreSpriteSize(this._member, p);
      this._width = w;
      this._height = h;
      this._stretched = w !== this._member.width || h !== this._member.height;
    }
    if (!o.has('ink')) this.ink = p.ink;
    if (!o.has('blend')) {
      this.blend = p.blend;
      this.blendRaw = p.blendRaw;
    }
    if (!o.has('flip')) {
      this.flipH = p.flipH;
      this.flipV = p.flipV;
    }
    if (!o.has('rotation')) this.rotation = p.rotation;
    this.foreColor = p.foreColor;
    this.backColor = p.backColor;
    this.scoreActive = true;
  }

  // Released channel on a plain frame advance: only the score fields that changed since the previous frame.
  applyScoreDelta(p: ScoreProps, changed: Set<string>): void {
    if (changed.has('member')) {
      const prev = this._member;
      this._member = p.member;
      this.memberChanged(prev);
    }
    if (changed.has('loc')) {
      this._locH = p.locH;
      this._locV = p.locV;
    }
    if (changed.has('size') || changed.has('member')) {
      const [w, h] = scoreSpriteSize(this._member, p);
      this._width = w;
      this._height = h;
      this._stretched = w !== this._member.width || h !== this._member.height;
    }
    if (changed.has('ink')) this.ink = p.ink;
    if (changed.has('blend')) {
      this.blend = p.blend;
      this.blendRaw = p.blendRaw;
    }
    if (changed.has('flip')) {
      this.flipH = p.flipH;
      this.flipV = p.flipV;
    }
    if (changed.has('rotation')) this.rotation = p.rotation;
    if (changed.has('color')) {
      this.foreColor = p.foreColor;
      this.backColor = p.backColor;
    }
    this.overridden.clear();
  }

  // Score channel became empty (end of span) for a non-puppet sprite.
  // `visible` is a channel property in Director (the score's channel toggle): it is NOT reset by span
  // changes and stays as Lingo left it (verified: Class_VersusScreen.load hides channels 8..35 at frame 545,
  // before their spans start at 572, and the original keeps them hidden; unload() restores them itself).
  clearScore(): void {
    this.released = false;
    this.scoreActive = false;
    this.overridden.clear();
    this._member = MEMBER_EMPTY;
    this._width = 0;
    this._height = 0;
    this.locZ = this.spriteNum;
    this.rotation = 0;
    this.foreColor = DEFAULT_FORECOLOR;
    this.backColor = DEFAULT_BACKCOLOR;
  }
}

// Track ink/blend/flip/visible/locZ/rotation overrides too: wrap the plain fields with accessors.
for (const prop of ['ink', 'blend', 'flipH', 'flipV', 'visible', 'locZ', 'rotation'] as const) {
  const key = '_' + prop;
  const flag = prop === 'flipH' || prop === 'flipV' ? 'flip' : prop;
  Object.defineProperty(Sprite.prototype, prop, {
    get(this: any) {
      return this[key];
    },
    set(this: any, v: any) {
      if (this.spriteNum === 0) return;
      if (this.scoreActive) this.overridden.add(flag);
      const visChanged = prop === 'visible' && this[key] !== undefined && !this[key] !== !v;
      this[key] = v;
      if (prop === 'blend') this.blendRaw = blendRaw(v);
      spriteSet(this);
      if (visChanged) visibleChanged(this);
    },
    configurable: true,
  });
}

const channels: Sprite[] = [];
for (let i = 0; i <= CHANNEL_COUNT; i++) channels.push(new Sprite(i));

// sprite(n). sprite(0) is a dead sprite: property writes are ignored.
export function sprite(n: number): Sprite {
  return channels[n] || channels[0];
}

export function allSprites(): Sprite[] {
  return channels;
}

// Advance every on-stage film loop by one frame (called once per score frame, before drawing).
// The first frame a loop is shown is its frame 1; non-looping loops hold their last frame.
export function advanceFilmLoops(): void {
  for (const s of channels) {
    const fl = s.member.filmLoop;
    if (!fl || s.spriteNum === 0 || !(s.puppet || s.scoreActive) || !s.visible) continue;
    if (!s.loopShown) {
      s.loopShown = true;
      continue;
    }
    if (s.loopFrame < fl.frameCount) s.loopFrame++;
    else if (fl.loops) s.loopFrame = 1;
  }
}

// ---------------------------------------------------------------- rendering

// Per-member, per-ink cached canvases with background removed.
const inkCache = new WeakMap<Member, Map<string, HTMLCanvasElement>>();

function sourceCanvas(m: Member): HTMLCanvasElement | null {
  if (!m.hasImage()) return null;
  return m.image.canvas;
}

function buildInkCanvas(m: Member, ink: number): HTMLCanvasElement | null {
  const src = sourceCanvas(m);
  if (!src) return null;
  // Inks 8/36 key palette index 0, which is white in every bitmap except a few with their own palette.
  const [kr, kg, kb] = m.keyColor;
  const isWhite = (d: Uint8ClampedArray, i: number) => d[i] === kr && d[i + 1] === kg && d[i + 2] === kb;
  if (ink !== INK_BGTRANSPARENT && ink !== INK_MATTE) return src;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const w = c.width;
  const h = c.height;
  if (ink === INK_BGTRANSPARENT) {
    for (let i = 0; i < d.length; i += 4) if (isWhite(d, i)) d[i + 3] = 0;
  } else {
    // Matte: white pixels connected to the image edge become transparent.
    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      const p = y * w + x;
      if (!seen[p] && isWhite(d, p * 4)) {
        seen[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (stack.length) {
      const p = stack.pop()!;
      d[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function inkCanvas(m: Member, ink: number): HTMLCanvasElement | null {
  // Ink 7 (not ghost) appears on one button-flash frame; white-transparent is a close approximation.
  if (ink === 7) ink = INK_BGTRANSPARENT;
  let map = inkCache.get(m);
  if (!map) {
    map = new Map();
    inkCache.set(m, map);
  }
  const key = `${ink}:${m.version}:${m.hasImage() ? m.image.version : 0}`;
  let c = map.get(key);
  if (!c) {
    const built = buildInkCanvas(m, ink);
    if (!built) return null;
    map.clear();
    map.set(key, built);
    c = built;
  }
  return c;
}

// Film loop frame f composed into a canvas the size of the loop's rect. Sub-sprites keep their own inks.
let memberLookup: ((castLib: number, num: number) => Member) | null = null;
export function setMemberLookup(fn: (castLib: number, num: number) => Member): void {
  memberLookup = fn;
}
const loopCache = new WeakMap<Member, Map<number, HTMLCanvasElement>>();

function filmLoopCanvas(m: Member, f: number): HTMLCanvasElement | null {
  const fl = m.filmLoop!;
  let cache = loopCache.get(m);
  if (!cache) {
    cache = new Map();
    loopCache.set(m, cache);
  }
  const frame = ((Math.max(1, f) - 1) % Math.max(1, fl.frameCount)) + 1;
  const hit = cache.get(frame);
  if (hit) return hit;
  const [left, top, right, bottom] = fl.rect;
  const c = document.createElement('canvas');
  c.width = Math.max(1, right - left);
  c.height = Math.max(1, bottom - top);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const spans = fl.sprites.slice().sort((a, b) => a.channel - b.channel);
  for (const span of spans) {
    for (const st of span.states) {
      if (frame < st.from || frame > st.to) continue;
      const sub = memberLookup ? memberLookup(st.castLib, st.member) : MEMBER_EMPTY;
      if (sub.type === 'shape') {
        ctx.globalAlpha = Math.min(1, (st.blend ?? 100) / 100);
        ctx.globalCompositeOperation = 'source-over';
        drawShape(ctx, sub, scoreColor(st.foreColor, DEFAULT_FORECOLOR), st.locH - sub.regPoint.locH - left, st.locV - sub.regPoint.locV - top, ...scoreSpriteSize(sub, st));
        continue;
      }
      if (sub === MEMBER_EMPTY || sub.type !== 'bitmap') continue;
      const src = inkCanvas(sub, st.ink);
      if (!src) continue;
      const [w, h] = scoreSpriteSize(sub, st);
      const sx = sub.width ? w / sub.width : 1;
      const sy = sub.height ? h / sub.height : 1;
      ctx.globalAlpha = Math.min(1, (st.blend ?? 100) / 100);
      ctx.globalCompositeOperation = st.ink === INK_DARKEST ? 'darken' : 'source-over';
      const fh = !!(st as any).flipH, fv = !!(st as any).flipV;
      if (fh || fv) {
        // Flipped sub-sprite: mirrored around its reg point, like a flipped stage sprite (e.g. the
        // name_and_moves_BG banner inside loop_name_<villain> on the villain select screen).
        const x0 = st.locH - (fh ? (sub.width - sub.regPoint.locH) * sx : sub.regPoint.locH * sx) - left;
        const y0 = st.locV - (fv ? (sub.height - sub.regPoint.locV) * sy : sub.regPoint.locV * sy) - top;
        ctx.save();
        ctx.translate(fh ? x0 + w : x0, fv ? y0 + h : y0);
        ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
        ctx.drawImage(src, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(src, st.locH - sub.regPoint.locH * sx - left, st.locV - sub.regPoint.locV * sy - top, w, h);
      }
    }
  }
  cache.set(frame, c);
  return c;
}

// QuickDraw shape member: filled shapes are painted in the sprite's foreColor (the member's own colour
// fields are only the authoring defaults). Only filled rectangles (shapeType 1, fillType 1) occur here.
function drawShape(ctx: CanvasRenderingContext2D, m: Member, color: string, x: number, y: number, w: number, h: number): void {
  const info = (m.textInfo ?? {}) as Record<string, any>;
  if (info.fillType === 0) return; // unfilled outline shapes are not used by the game
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export type TextRenderer = (ctx: CanvasRenderingContext2D, s: Sprite, r: Rect) => void;
let textRenderer: TextRenderer | null = null;
export function setTextRenderer(fn: TextRenderer): void {
  textRenderer = fn;
}

// ---------------------------------------------------------------- stage update region (dirty rects)

// Director does not repaint the whole stage every frame. The stage update (Dirapi FUN_68061A21 -> the sprite
// renderers -> Iml32 CopyBits, Ordinal_1616/1634) repaints a list of rectangles, one after the other (each
// rect: the stage background, then every sprite that intersects it, clipped to it); everything outside keeps
// the pixels of earlier frames. The list is built exactly like Director builds it (docs/DIRECTOR_INTERNALS.md s.7, verified tick
// by tick against Dirapi's own list with run_projector.py --region-trace and verification/diff/region_diff.mjs):
//  * Dirapi FUN_6805bc75 syncs one channel: if its score record / channel state changed since the last sync, the
//    rect it had (S+0xC8) is added with slop 0 (FUN_6806c6f8), the sprite is recomputed and its new rect is
//    added with slop 20 (FUN_6806c6b3; 0 while a trails sprite was met in this pass, never the case here).
//  * When a frame is entered, every channel is synced in channel order (FUN_6805c1a3, from the score player).
//  * A Lingo sprite property set (FUN_6802c3dc) syncs that channel at once only while the score object's
//    "immediate" flag (+0x16C) is set: during prepareFrame (FUN_68065756) and beginSprite (FUN_6805ba3c).
//    Elsewhere (exitFrame, enterFrame, mouse handlers) the change waits for the next frame's sync pass, so only
//    the final state counts. So a sprite-manager channel that gets a member at loc (0, 0), then locH, then
//    locV in prepareFrame adds its intermediate rects too (fighter_robin t1285).
//  * Adding a rect (FUN_6807577b): empty rects are dropped; the rect is clipped to the stage; the first list
//    rect that overlaps the clipped rect grown by the slop on every side gets the clipped rect unioned in; every
//    later list rect that overlaps (the grown rect, not the union) is unioned into that first one and removed,
//    and because the loop index still advances, the rect that slides into the removed slot is not tested; with
//    no overlap the clipped rect is appended. (fighter_plasmus t1175: Plasmus' new rect is 10 px left of the
//    opponent's, and the opponent's new rect with slop 20 merges both into one rect that covers Plasmus' whole
//    shadow.)
// The repaint is pixel-identical to a full redraw except where the result of a blit depends on its clip (see
// planStretch / blitAliasedRow): e.g. the ending's stage column 599 keeps what a clipped ending_interlace
// stretch left there, and FX_shadow cut at the bottom of an update rect is copied row for row.
type IRect0 = { left: number; top: number; right: number; bottom: number };
type ChannelState = { key: string; rect: Rect; visible: boolean };
const drawnState = new Map<number, ChannelState>();
const updList: IRect0[] = [];
const NEW_RECT_SLOP = 20;
let stageBg = '';
let stageW = 0;
let stageH = 0;
// The clip of the rect being repainted (stage coordinates), used by the software blitters, which write pixels
// directly (putImageData ignores the canvas clip).
let curClip: IRect0 = { left: 0, top: 0, right: 0, bottom: 0 };
let lastRegion: IRect0[] = [];
export const lastUpdateRegion = () => lastRegion;

function channelPresent(s: Sprite): boolean {
  return s.spriteNum > 0 && s.member !== MEMBER_EMPTY && s.member.type !== 'empty' && (s.puppet || s.scoreActive);
}

// Dirapi FUN_6807577b: add one rect to the stage update list.
function addUpdateRect(r: IRect0, slop: number): void {
  if (r.right <= r.left || r.bottom <= r.top) return;
  const sw = stageW || 600, sh = stageH || 400;
  const c = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(sw, r.right), bottom: Math.min(sh, r.bottom) };
  if (c.right <= c.left || c.bottom <= c.top) return;
  const L = c.left - slop, T = c.top - slop, R = c.right + slop, B = c.bottom + slop;
  let hit = -1;
  for (let i = 0; i < updList.length; i++) {
    const p = updList[i];
    if (p.left < R && L < p.right && p.top < B && T < p.bottom) {
      const q = hit < 0 ? c : p;
      const d = hit < 0 ? p : updList[hit];
      d.left = Math.min(d.left, q.left);
      d.top = Math.min(d.top, q.top);
      d.right = Math.max(d.right, q.right);
      d.bottom = Math.max(d.bottom, q.bottom);
      if (hit < 0) hit = i;
      else updList.splice(i, 1); // Director's loop then advances past the rect that moved into slot i
    }
  }
  if (hit < 0) updList.push(c);
}

function channelKey(s: Sprite, r: Rect): string {
  const m = s.member;
  const img = m.hasImage() ? m.image.version : 0;
  // A film loop's frame is not part of the channel's state: its sub-sprites are synced by the loop's own sub-score
  // (syncFilmLoops).
  const loop = 0;
  const text = m.type === 'text' || m.type === 'field' ? m.text : '';
  return `${m.castLibNum}:${m.number}:${m.version}:${img}|${r.left},${r.top},${r.right},${r.bottom}|${s.width}x${s.height}|${s.ink}|${s.blendRaw}|${s.blend}|${s.flipH ? 1 : 0}${s.flipV ? 1 : 0}|${s.rotation}|${s.locZ}|${loop}|${s.foreColor}|${s.backColor}|${text}`;
}

// Dirapi FUN_6805bc75 for one channel: old rect (slop 0) and new rect (slop 20) when its drawn state changed.
// Invisible sprites count too: the channel's "drawable" bit (S+0x4C & 1, FUN_6806cc33) is set for any channel
// with a member, visible or not, so hidden sprites that change still add their rects; a sprite that has just been
// hidden adds its old rect a second time (FUN_6806c785) (walk_cross t932: a hidden HUD segment's rect, added with
// slop 20, merges two rects into one).
function syncChannel(s: Sprite): void {
  if (s.spriteNum === 0) return;
  const prev = drawnState.get(s.spriteNum);
  if (!channelPresent(s)) {
    if (prev) {
      addUpdateRect(prev.rect, 0);
      drawnState.delete(s.spriteNum);
    }
    loopStates.delete(s.spriteNum);
    return;
  }
  const rect = s.stageRect();
  const key = channelKey(s, rect);
  if (prev && prev.key === key && prev.visible === s.visible) return;
  if (prev) {
    addUpdateRect(prev.rect, 0);
    if (prev.visible && !s.visible) addUpdateRect(prev.rect, 0);
  }
  if (s.member.filmLoop) syncLoopChannel(s, rect);
  else {
    loopStates.delete(s.spriteNum);
    addUpdateRect(rect, NEW_RECT_SLOP);
  }
  drawnState.set(s.spriteNum, { key, rect, visible: s.visible });
}

// ---- film loops: Director plays a film loop through its own sub-score (Dirapi FUN_6808438a, FUN_680620e0,
// FUN_680615d7). The loop channel itself never adds its new rect (FUN_6806c6b3 skips channel kinds 4/5); instead:
//  * when the loop appears, its sub-score is created and runs its first frame pass before the loop's stage
//    transform is set, so each sub-sprite's rect is added in the loop's own (authoring) coordinates with slop 20
//    (loop_vs_bg_enemy at (407, 0) adds rect(0, 0, 600, 400), fighter_plasmus t365); then the transform is set
//    (FUN_680620e0): if the loop does not sit at its authoring position, every sub-sprite adds its old (loop
//    coordinates) and new (stage) rect with slop 0; then every sub-sprite adds its stage rect with slop 0 again;
//  * when the loop channel moves, FUN_680620e0 adds every sub-sprite's old and new rect (slop 0), then each new
//    rect again;
//  * after the main frame pass, every film loop that advanced runs its sub-score's frame pass (FUN_680615d7 ->
//    FUN_6805c1a3): a sub-sprite whose score state differs between the two loop frames adds its old rect (slop 0)
//    and its new rect (slop 20), as for stage channels (the menu's loading bar, fighter_plasmus t21-24).
type LoopSub = { key: string; rect: IRect0 };
type LoopState = { member: Member; ox: number; oy: number; frame: number; subs: Map<number, LoopSub> };
const loopStates = new Map<number, LoopState>();

// The film loop's sub-sprite rects at loop frame f (sub channel -> state and rect), offset by (ox, oy) from the
// loop's authoring coordinates.
function loopSubs(m: Member, f: number, ox: number, oy: number): Map<number, LoopSub> {
  const fl = m.filmLoop!;
  const frame = ((Math.max(1, f) - 1) % Math.max(1, fl.frameCount)) + 1;
  const out = new Map<number, LoopSub>();
  const spans = fl.sprites.slice().sort((a, b) => a.channel - b.channel);
  for (const span of spans) {
    const st = span.states.find((x) => frame >= x.from && frame <= x.to);
    if (!st || !st.member || out.has(span.channel)) continue;
    const sub = memberLookup ? memberLookup(st.castLib, st.member) : MEMBER_EMPTY;
    if (!sub || sub === MEMBER_EMPTY || sub.type === 'empty') continue;
    const [w, h] = scoreSpriteSize(sub, st);
    let r: Rect;
    if (w === 0) r = new Rect(st.locH, st.locV, st.locH, st.locV);
    else {
      const sx = sub.width ? w / sub.width : 1;
      const sy = sub.height ? h / sub.height : 1;
      const left = Math.round(st.locH - sub.regPoint.locH * sx);
      const top = Math.round(st.locV - sub.regPoint.locV * sy);
      r = new Rect(left, top, left + w, top + h);
      let rot = Math.round((Number(st.rotation) || 0) * 100);
      let skew = 0;
      if (st.flipH) {
        rot += 18000;
        skew += 18000;
      }
      if (st.flipV) skew += 18000;
      if (sub.type === 'bitmap' && h !== 0 && (rot % 36000 !== 0 || skew % 36000 !== 0)) r = quadBounds(r, st.locH, st.locV, rot, skew);
    }
    out.set(span.channel, { key: subStateKey(st), rect: { left: r.left + ox, top: r.top + oy, right: r.right + ox, bottom: r.bottom + oy } });
  }
  return out;
}

// What FUN_6805bc75 compares between two score records: member, loc, ink and stretch flag, the size only for a
// stretched sprite, blend, flips, rotation/skew and colours (not the script field, and not the stored size of an
// unstretched sprite: loop_name_robin's sub-sprites change their stored size between loop frames 1 and 2 and
// Director adds no rect for that).
function subStateKey(st: { castLib: number; member: number; locH: number; locV: number; width: number; height: number; ink: number; blend: number; stretch?: boolean; flipH?: boolean; flipV?: boolean; rotation?: number; foreColor?: unknown; backColor?: unknown }): string {
  const raw = (st as { blendRaw?: number }).blendRaw ?? st.blend;
  return `${st.castLib}:${st.member}|${st.locH},${st.locV}|${st.stretch ? `${st.width}x${st.height}` : ''}|${st.ink}|${st.stretch ? 1 : 0}|${raw}|${st.flipH ? 1 : 0}${st.flipV ? 1 : 0}|${st.rotation ?? 0}|${String(st.foreColor ?? '')}|${String(st.backColor ?? '')}`;
}

// The loop channel changed (appeared, moved, or another property changed): its sub-score's part of the sync.
function syncLoopChannel(s: Sprite, rect: Rect): void {
  const m = s.member;
  const fl = m.filmLoop!;
  const ox = rect.left - fl.rect[0], oy = rect.top - fl.rect[1];
  const ls = loopStates.get(s.spriteNum);
  if (!ls || ls.member !== m) {
    const local = loopSubs(m, s.loopFrame, 0, 0);
    for (const sub of local.values()) addUpdateRect(sub.rect, NEW_RECT_SLOP);
    const stage = loopSubs(m, s.loopFrame, ox, oy);
    if (ox !== 0 || oy !== 0) {
      for (const [ch, sub] of local) {
        addUpdateRect(sub.rect, 0);
        addUpdateRect(stage.get(ch)!.rect, 0);
      }
    }
    for (const sub of stage.values()) addUpdateRect(sub.rect, 0);
    loopStates.set(s.spriteNum, { member: m, ox, oy, frame: s.loopFrame, subs: stage });
    return;
  }
  if (ox === ls.ox && oy === ls.oy) return;
  const stage = loopSubs(m, ls.frame, ox, oy);
  // FUN_680620e0 only re-syncs the sub-sprites when the loop is (or was) away from its authoring position.
  if (ox !== 0 || oy !== 0 || ls.ox !== 0 || ls.oy !== 0) {
    for (const [ch, sub] of ls.subs) {
      addUpdateRect(sub.rect, 0);
      const n = stage.get(ch);
      if (n) addUpdateRect(n.rect, 0);
    }
  }
  for (const sub of stage.values()) addUpdateRect(sub.rect, 0);
  ls.ox = ox;
  ls.oy = oy;
  ls.subs = stage;
}

// One film loop's sub-score frame pass, if its frame changed (FUN_680615d7 -> FUN_6805c1a3 on the sub-score).
function syncFilmLoop(s: Sprite): void {
  const ls = loopStates.get(s.spriteNum);
  if (!ls) return;
  if (s.member !== ls.member || !channelPresent(s)) {
    loopStates.delete(s.spriteNum);
    return;
  }
  if (s.loopFrame === ls.frame) return;
  const next = loopSubs(ls.member, s.loopFrame, ls.ox, ls.oy);
  const chans = [...new Set([...ls.subs.keys(), ...next.keys()])].sort((a, b) => a - b);
  for (const ch of chans) {
    const o = ls.subs.get(ch), n = next.get(ch);
    if (o && n && o.key === n.key) continue;
    if (o) addUpdateRect(o.rect, 0);
    if (n) addUpdateRect(n.rect, NEW_RECT_SLOP);
  }
  ls.frame = s.loopFrame;
  ls.subs = next;
}

// The sub-score frame passes of the film loops that advanced (after the main sync pass, before prepareFrame).
export function syncFilmLoops(): void {
  for (const s of channels) syncFilmLoop(s);
}

// Lingo `sprite.visible = v` that changes the value also adds the channel's stored rect (S+0xC8) with slop 0 at
// once, after the set's own sync (Dirapi FUN_6801199f -> FUN_6802e2d9 -> FUN_6806c785), in any context: a mouseEnter
// handler showing a hidden sprite puts its rect first in the next update's list (fighter_plasmus t311).
function visibleChanged(s: Sprite): void {
  const d = drawnState.get(s.spriteNum);
  if (d && channelPresent(s)) addUpdateRect(d.rect, 0);
}

// A Lingo sprite property set (after the value is written).
function spriteSet(s: Sprite): void {
  if (immediateDepth > 0) syncChannel(s);
}

// The sync pass when a frame is entered (Dirapi FUN_6805c1a3): every channel, in channel order.
export function syncChannels(): void {
  for (const s of channels) syncChannel(s);
}

// Runs fn with Lingo sprite sets applied at once (Director's prepareFrame / beginSprite).
export function withImmediateSpriteUpdates(fn: () => void): void {
  immediateDepth++;
  try {
    fn();
  } finally {
    immediateDepth--;
  }
}

// A palette switch at the stage update invalidates the whole stage (Dirapi FUN_6805c880 -> FUN_68060c46, on a
// stage deeper than 8 bits), after every channel's rects; so does `(the stage).bgColor = c`, at once (FUN_68026848 ->
// FUN_68060c6b -> FUN_68075fa2), whether or not the colour changes.
let stagePalette = '';
let drawnPalette = '';
export function setStagePalette(key: string): void {
  stagePalette = key;
}
export function invalidateStage(): void {
  addUpdateRect({ left: 0, top: 0, right: stageW || 600, bottom: stageH || 400 }, 0);
}

// The rects to repaint this update.
function updateRegion(): IRect0[] {
  // Changes that did not go through a sync (none in Director's own flow) are picked up here, after the Lingo-time
  // rects; then a palette switch repaints the whole stage.
  syncChannels();
  syncFilmLoops();
  if (stagePalette !== drawnPalette) {
    if (drawnPalette) invalidateStage();
    drawnPalette = stagePalette;
  }
  return updList.splice(0);
}

export function renderStage(ctx: CanvasRenderingContext2D, width: number, height: number, bgColor: string): void {
  // Channels without a member keep their last rect (fighter_cinderblock t312: a tag emptied at t294 and filled
  // again by a mouse handler still reports its old member's rect).
  for (const s of channels) if (s.member !== MEMBER_EMPTY) s.refreshRect();
  let region = updateRegion();
  if (bgColor !== stageBg || width !== stageW || height !== stageH) {
    // First frame (or a new stage): everything.
    stageBg = bgColor;
    stageW = width;
    stageH = height;
    region = [{ left: 0, top: 0, right: width, bottom: height }];
  }
  lastRegion = region;
  if (!region.length) return;
  const list = channels.filter((s) => s.visible && channelPresent(s));
  list.sort((a, b) => a.locZ - b.locZ || a.spriteNum - b.spriteNum);
  const bounds = list.map((s) => {
    const q = s.stageRect();
    const d = s.drawRect;
    return { left: Math.min(q.left, d.left) - 1, top: Math.min(q.top, d.top) - 1, right: Math.max(q.right, d.right) + 1, bottom: Math.max(q.bottom, d.bottom) + 1 };
  });
  for (const rc of region) {
    curClip = rc;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rc.left, rc.top, rc.right - rc.left, rc.bottom - rc.top);
    ctx.clip();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Director scales bitmaps by pixel replication, never with filtering.
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = bgColor;
    ctx.fillRect(rc.left, rc.top, rc.right - rc.left, rc.bottom - rc.top);
    list.forEach((s, i) => {
      const b = bounds[i];
      // Skip sprites entirely outside this rect (the bounding box of the drawn and the reported rect).
      if (!s.rotation && (b.right <= rc.left || b.left >= rc.right || b.bottom <= rc.top || b.top >= rc.bottom)) return;
      drawSprite(ctx, s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}

// Stretched (scaled) sprites: Director replicates source pixels with destination pixel d taking source pixel
// floor(d * srcSize / dstSize) on each axis (verified on the select screen's selectanim_anim_button01, 130x42
// stretched to 130x90: all rows match exactly; the canvas' own nearest-neighbour sampling, which samples at
// pixel centres, picks other rows). Cached per source canvas and size.
const scaledCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function scaleMap(d: number, src: number, dst: number): number {
  return Math.min(src - 1, Math.floor((d * src) / dst));
}
function scaledCanvas(src: HTMLCanvasElement, dw: number, dh: number): HTMLCanvasElement {
  dw = Math.round(Math.abs(dw));
  dh = Math.round(Math.abs(dh));
  if (dw === src.width && dh === src.height) return src;
  let map = scaledCache.get(src);
  if (!map) {
    map = new Map();
    scaledCache.set(src, map);
  }
  const key = `${dw}x${dh}`;
  const hit = map.get(key);
  if (hit) return hit;
  const sw = src.width, sh = src.height;
  const c = document.createElement('canvas');
  c.width = Math.max(1, dw);
  c.height = Math.max(1, dh);
  if (dw > 0 && dh > 0 && sw > 0 && sh > 0) {
    const sd = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, sw, sh).data;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(dw, dh);
    const od = out.data;
    const xs = new Int32Array(dw);
    for (let x = 0; x < dw; x++) xs[x] = scaleMap(x, sw, dw);
    for (let y = 0; y < dh; y++) {
      const row = scaleMap(y, sh, dh) * sw;
      let o = y * dw * 4;
      for (let x = 0; x < dw; x++, o += 4) {
        const i = (row + xs[x]) * 4;
        od[o] = sd[i];
        od[o + 1] = sd[i + 1];
        od[o + 2] = sd[i + 2];
        od[o + 3] = sd[i + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  if (map.size > 64) map.clear();
  map.set(key, c);
  return c;
}

// ---------------------------------------------------------------- blend ink maths

// Director's blend: the sprite's blend percentage is stored as a byte raw = 255 for 0% .. 0 for 100%
// (Lingo `blend = 30` stores 179, read back as 100 - (raw * 100 + 127) / 255; docs/DIRECTOR_INTERNALS.md s.5); the renderer turns
// it into a level 0..256 = (0xFF00 - raw * 0x100) / 0xFF (Dirapi FUN_6806e4dc, channel struct +0x130) and the
// blitter mixes integer channels with it. Canvas globalAlpha blends in float and rounds, which is off by 1-2
// per channel, so blended sprites are mixed in software here.
// Lingo `sprite.blend = pct` -> stored byte (Lingo blend = 30 stores 179).
export function blendRaw(pct: number): number {
  pct = Math.round(Number(pct) || 0);
  if (pct >= 100) return 0;
  if (pct <= 0) return 255;
  return Math.floor(((100 - pct) * 255 + 50) / 100);
}
// Blitter level 0..256 for a blend byte (Dirapi FUN_6806e4dc).
export function blendLevel(raw: number): number {
  return Math.floor(((255 - raw) * 256) / 255);
}
// dst + (src - dst) * level / 256, rounded down (= (src * level + dst * (256 - level)) >> 8). Verified against the
// projector on the intro's white shape fade (blend bytes 112 and 229) and the select screen's overlays.
function mix(sv: number, dv: number, L: number): number {
  return dv + (((sv - dv) * L) >> 8);
}

let blendTmp: HTMLCanvasElement | null = null;
// Paints with `paint` (into a context translated to stage coordinates, alpha 1) and mixes the painted pixels
// into ctx's pixels inside [x0, y0, x1, y1) with blend byte raw.
// orInk: Director's blit mode 9 (ink 7, Iml32 FUN_6900b2e0: dst = dst | src on the colour bits) instead of a blend.
function softBlend(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, raw: number, paint: (t: CanvasRenderingContext2D) => void, orInk = false): void {
  // Only inside the current update region (putImageData ignores the canvas clip).
  x0 = Math.max(curClip.left, Math.floor(x0));
  y0 = Math.max(curClip.top, Math.floor(y0));
  x1 = Math.min(curClip.right, Math.ceil(x1));
  y1 = Math.min(curClip.bottom, Math.ceil(y1));
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  if (!blendTmp) blendTmp = document.createElement('canvas');
  if (blendTmp.width < w || blendTmp.height < h) {
    blendTmp.width = Math.max(blendTmp.width, w);
    blendTmp.height = Math.max(blendTmp.height, h);
  }
  const t = blendTmp.getContext('2d', { willReadFrequently: true })!;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalAlpha = 1;
  t.globalCompositeOperation = 'source-over';
  t.clearRect(0, 0, w, h);
  t.imageSmoothingEnabled = false;
  t.translate(-x0, -y0);
  paint(t);
  t.setTransform(1, 0, 0, 1, 0, 0);
  const src = t.getImageData(0, 0, w, h).data;
  const dstImg = ctx.getImageData(x0, y0, w, h);
  const dst = dstImg.data;
  const L = blendLevel(raw);
  if (orInk) {
    for (let i = 0; i < src.length; i += 4) {
      if (src[i + 3] === 0) continue;
      dst[i] |= src[i];
      dst[i + 1] |= src[i + 1];
      dst[i + 2] |= src[i + 2];
    }
    ctx.putImageData(dstImg, x0, y0);
    return;
  }
  for (let i = 0; i < src.length; i += 4) {
    if (src[i + 3] === 0) continue;
    dst[i] = mix(src[i], dst[i], L);
    dst[i + 1] = mix(src[i + 1], dst[i + 1], L);
    dst[i + 2] = mix(src[i + 2], dst[i + 2], L);
  }
  ctx.putImageData(dstImg, x0, y0);
}

// Draws one image with an optional blend (copy-style inks only; darkest/darken keep the canvas modes).
function blit(ctx: CanvasRenderingContext2D, raw: number, op: GlobalCompositeOperation, x0: number, y0: number, x1: number, y1: number, paint: (t: CanvasRenderingContext2D) => void): void {
  if (raw <= 0 || op !== 'source-over') {
    ctx.globalAlpha = Math.min(1, Math.max(0, 255 - raw) / 255);
    ctx.globalCompositeOperation = op;
    paint(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  if (raw >= 255) return;
  softBlend(ctx, x0, y0, x1, y1, raw, paint);
}

// Film loop frame drawn straight onto the stage, sub-sprite by sub-sprite with their own inks and blends
// (Director draws a film loop's sprites like stage sprites; composing them into one image first would blend
// the blended sub-sprites against transparency instead of the stage). ox/oy: stage position of the loop rect.
function drawFilmLoopDirect(ctx: CanvasRenderingContext2D, m: Member, f: number, ox: number, oy: number): void {
  const fl = m.filmLoop!;
  const frame = ((Math.max(1, f) - 1) % Math.max(1, fl.frameCount)) + 1;
  const [left, top] = fl.rect;
  const spans = fl.sprites.slice().sort((a, b) => a.channel - b.channel);
  for (const span of spans) {
    for (const st of span.states) {
      if (frame < st.from || frame > st.to) continue;
      const sub = memberLookup ? memberLookup(st.castLib, st.member) : MEMBER_EMPTY;
      const raw = (st as any).blendRaw ?? 0;
      if (sub.type === 'shape') {
        const [w, h] = scoreSpriteSize(sub, st);
        const x = ox + st.locH - sub.regPoint.locH - left, y = oy + st.locV - sub.regPoint.locV - top;
        blit(ctx, raw, 'source-over', x, y, x + w, y + h, (t) => drawShape(t, sub, scoreColor(st.foreColor, DEFAULT_FORECOLOR), x, y, w, h));
        continue;
      }
      if (sub === MEMBER_EMPTY || sub.type !== 'bitmap') continue;
      const src0 = inkCanvas(sub, st.ink);
      if (!src0) continue;
      const [w, h] = scoreSpriteSize(sub, st);
      const src = scaledCanvas(src0, w, h);
      const sx = sub.width ? w / sub.width : 1;
      const sy = sub.height ? h / sub.height : 1;
      const fh = !!(st as any).flipH, fv = !!(st as any).flipV;
      const x0 = ox + st.locH - (fh ? (sub.width - sub.regPoint.locH) * sx : sub.regPoint.locH * sx) - left;
      const y0 = oy + st.locV - (fv ? (sub.height - sub.regPoint.locV) * sy : sub.regPoint.locV * sy) - top;
      const op: GlobalCompositeOperation = st.ink === INK_DARKEST ? 'darken' : 'source-over';
      blit(ctx, raw, op, x0, y0, x0 + w, y0 + h, (t) => {
        if (fh || fv) {
          t.save();
          t.translate(fh ? x0 + w : x0, fv ? y0 + h : y0);
          t.scale(fh ? -1 : 1, fv ? -1 : 1);
          t.drawImage(src, 0, 0, w, h);
          t.restore();
        } else {
          t.drawImage(src, x0, y0, w, h);
        }
      });
    }
  }
}

// ---------------------------------------------------------------- Director's stretched blits

// Stretched bitmaps go through Iml32's CopyBits (Ordinal_1616 -> FUN_69029df0 -> FUN_69001bf0 -> FUN_69003b00
// for a 32-bit stage). The rules that change pixels, all reverse-engineered from Iml32.dll (docs/DIRECTOR_INTERNALS.md
// s.6) and checked against the projector:
// 1. Clipping (FUN_69029df0): the destination rect is clipped to the stage and the update region; the source
//    rect loses ((clip edge - dst edge) * srcSize) / dstSize pixels per clipped edge (integer division). An axis
//    is scaled only when the CLIPPED source and destination sizes differ: FX_shadow 197x49 -> 200x50 cut by the
//    stage bottom (dst rows 354..400 = 46, src rows 0..46 = 46) is copied row for row, one row higher than the
//    floor mapping would place it (fighter_plasmus).
// 2. Mapping (FUN_69004df0 + the row/column DDAs): destination pixel d (from the unclipped rect's edge) reads
//    source pixel floor(d * src / dst); the clip only sets the DDA's starting error, so the mapping is exact.
// 3. Shrinking horizontally combines the source pixels of each span [floor(d*S/D), floor((d+1)*S/D)):
//    indexed sources (1/2/4/8-bit) keep the pixel with the lowest in-memory palette index (FUN_69007060,
//    69007170, 69007290, 69007710: `if (*p < min) min = *p`), and Director's Windows build keeps 8-bit
//    bitmaps with their palette reversed (in-memory index = 255 - file index; 1-bit: black = 0), so the pixel
//    with the highest file index wins: the shrunk Starfire summon glow (8-bit, index 0 white, 123 glow) is one
//    pixel fatter on its left edges (fighter_robin etc. t1281-1284). For 8-bit sources the averaging fetch
//    (LAB_690073b0 -> FUN_69007500, per-byte mean of the span) is used instead unless the blit also shrinks
//    vertically with a key/mask ink (FUN_69001bf0's local_18); 32-bit sources average the same way or take the
//    plain floor pixel (FUN_69007930). Shrinking vertically with a plain ink averages the rows of each span
//    (FUN_690079e0/69007a20/69007a60); with a key or mask ink rows are only skipped.
// 4. Masks (matte ink) are stretched with the plain mapping, never combined (FUN_69006b60).
// 5. The scaled source row is fetched into a temp buffer sized for floor(min(srcW, dstW) * 65536 / ratio) + 3
//    pixels (FUN_690037f0; ratio = ceil(srcW * 65536 / dstW)); a large upscale writes past it into the
//    destination row buffer that follows (see blitAliasedRow).
type IRect = { left: number; top: number; right: number; bottom: number };
type StretchPlan = {
  dst: IRect; // unclipped destination (sprite drawRect)
  dstClip: IRect;
  srcClip: IRect;
  hScale: boolean;
  vScale: boolean;
  cap: number; // source row buffer capacity in pixels (Infinity when it cannot overflow)
};

function planStretch(dst: IRect, sw: number, sh: number, clip: IRect): StretchPlan | null {
  const dw = dst.right - dst.left, dh = dst.bottom - dst.top;
  const c = { left: Math.max(dst.left, clip.left), top: Math.max(dst.top, clip.top), right: Math.min(dst.right, clip.right), bottom: Math.min(dst.bottom, clip.bottom) };
  if (c.right <= c.left || c.bottom <= c.top) return null;
  const l = c.left > dst.left ? Math.floor(((c.left - dst.left) * sw) / dw) : 0;
  const r = dst.right > c.right ? Math.floor(((dst.right - c.right) * sw) / dw) : 0;
  const t = c.top > dst.top ? Math.floor(((c.top - dst.top) * sh) / dh) : 0;
  const b = dst.bottom > c.bottom ? Math.floor(((dst.bottom - c.bottom) * sh) / dh) : 0;
  const sc = { left: l, top: t, right: sw - r, bottom: sh - b };
  if (sc.right <= sc.left || sc.bottom <= sc.top) return null;
  const scw = sc.right - sc.left, dcw = c.right - c.left;
  const hScale = scw !== dcw;
  const vScale = sc.bottom - sc.top !== c.bottom - c.top;
  let cap = Infinity;
  if (hScale && dw > sw) {
    const ratio = Math.floor((sw * 65536 - 1 + dw) / dw) & 0xffff;
    if (ratio > 0) cap = Math.floor((Math.min(scw, dcw) * 65536) / ratio) + 3;
  }
  return { dst, dstClip: c, srcClip: sc, hScale, vScale, cap };
}

// Member pixels for the software stretch: opaque colours (ABGR as read from ImageData), the matte mask and the
// file palette index of each pixel (indexed members), built lazily and cached per image version.
type SrcPixels = { w: number; h: number; rgba: Uint32Array; matte: Uint8Array | null; fidx: Uint8Array | null; ver: string };
const srcPixelCache = new WeakMap<Member, SrcPixels>();
function sourcePixels(m: Member): SrcPixels | null {
  if (!m.hasImage()) return null;
  const ver = `${m.version}:${m.image.version}`;
  const hit = srcPixelCache.get(m);
  if (hit && hit.ver === ver) return hit;
  const c = m.image.canvas;
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
  const data: SrcPixels = { w: c.width, h: c.height, rgba: new Uint32Array(d.data.buffer.slice(0)), matte: null, fidx: null, ver };
  srcPixelCache.set(m, data);
  return data;
}
function matteMask(m: Member, p: SrcPixels): Uint8Array {
  if (p.matte) return p.matte;
  const mc = inkCanvas(m, INK_MATTE)!;
  const a = mc.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, p.w, p.h).data;
  const out = new Uint8Array(p.w * p.h);
  for (let i = 0; i < out.length; i++) out[i] = a[i * 4 + 3] ? 1 : 0;
  return (p.matte = out);
}
const rgbKey = (v: number) => v & 0xffffff; // ImageData little-endian: R | G << 8 | B << 16 | A << 24
// File palette index per pixel (1-bit: white 0 / black 1; 8-bit: lookup in the member's palette; otherwise an
// approximation by darkness, which only orders pixels when a shrink has to pick one).
function fileIndices(m: Member, p: SrcPixels): Uint8Array {
  if (p.fidx) return p.fidx;
  const out = new Uint8Array(p.w * p.h);
  const info = (m.textInfo ?? {}) as Record<string, any>;
  let table: Map<number, number> | null = null;
  const pal = info.palette as { castLib?: number; member?: number } | undefined;
  if (m.depth === 8 && pal && pal.castLib && pal.member && memberLookup) {
    const pm = memberLookup(pal.castLib, pal.member);
    const colors = (pm?.textInfo as Record<string, any> | null)?.colors as string[] | undefined;
    if (Array.isArray(colors)) {
      table = new Map();
      colors.forEach((hex, i) => {
        const v = parseInt(hex.replace('#', ''), 16);
        const k = ((v >> 16) & 255) | (((v >> 8) & 255) << 8) | ((v & 255) << 16);
        if (!table!.has(k)) table!.set(k, i);
      });
    }
  }
  const [kr, kg, kb] = m.keyColor;
  const white = kr | (kg << 8) | (kb << 16);
  for (let i = 0; i < out.length; i++) {
    const k = rgbKey(p.rgba[i]);
    if (m.depth === 1) out[i] = k === white ? 0 : 1;
    else if (table && table.has(k)) out[i] = table.get(k)!;
    else out[i] = 255 - Math.round(((k & 255) * 299 + ((k >> 8) & 255) * 587 + ((k >> 16) & 255) * 114) / 1000);
  }
  return (p.fidx = out);
}

// Per-axis source index for every destination pixel of the unclipped rect, and the end of its shrink span.
function axisMap(dFull: number, sFull: number, scale: boolean, clipOff: number, srcClipStart: number): { at: Int32Array; end: Int32Array } {
  const at = new Int32Array(dFull), end = new Int32Array(dFull);
  for (let d = 0; d < dFull; d++) {
    if (scale) {
      at[d] = Math.min(sFull - 1, Math.floor((d * sFull) / dFull));
      end[d] = Math.max(at[d] + 1, Math.min(sFull, Math.floor(((d + 1) * sFull) / dFull)));
    } else {
      at[d] = Math.max(0, Math.min(sFull - 1, srcClipStart + d - clipOff));
      end[d] = at[d] + 1;
    }
  }
  return { at, end };
}

const stretchCache = new WeakMap<Member, Map<string, { canvas: HTMLCanvasElement; px: Uint32Array }>>();
// The stretched sprite image (destination size, alpha 0 where the ink keys or masks a pixel).
function directorStretch(m: Member, ink: number, blendOn: boolean, plan: StretchPlan): { canvas: HTMLCanvasElement; px: Uint32Array } | null {
  const p = sourcePixels(m);
  if (!p) return null;
  const dw = plan.dst.right - plan.dst.left, dh = plan.dst.bottom - plan.dst.top;
  const keyed = ink === INK_BGTRANSPARENT;
  const masked = ink === INK_MATTE || ink === INK_NOTGHOST || (ink === INK_DARKEN && blendOn);
  const keyOrMask = keyed || masked || ink === INK_DARKEST;
  const hShrink = dw < p.w, vShrink = dh < p.h;
  const local18 = (vShrink && keyOrMask) || !hShrink;
  let hMode: 'none' | 'min' | 'avg' = 'none';
  if (plan.hScale && hShrink) {
    if (m.depth > 0 && m.depth <= 8) hMode = m.depth === 8 && !local18 && plan.dstClip.right - plan.dstClip.left < plan.srcClip.right - plan.srcClip.left ? 'avg' : 'min';
    else hMode = local18 ? 'none' : 'avg';
  }
  const vAvg = plan.vScale && vShrink && !keyOrMask;
  const xm = axisMap(dw, p.w, plan.hScale, plan.dstClip.left - plan.dst.left, plan.srcClip.left);
  const ym = axisMap(dh, p.h, plan.vScale, plan.dstClip.top - plan.dst.top, plan.srcClip.top);
  const key = `${dw}x${dh}|${ink}|${blendOn ? 1 : 0}|${plan.hScale ? 'h' : 'H' + (plan.srcClip.left - (plan.dstClip.left - plan.dst.left))}|${plan.vScale ? 'v' : 'V' + (plan.srcClip.top - (plan.dstClip.top - plan.dst.top))}|${p.ver}`;
  let map = stretchCache.get(m);
  if (!map) stretchCache.set(m, (map = new Map()));
  const hit = map.get(key);
  if (hit) return hit;
  const src = p.rgba, w = p.w;
  const fidx = hMode === 'min' ? fileIndices(m, p) : null;
  const matte = masked ? matteMask(m, p) : null;
  const [kr, kg, kb] = m.keyColor;
  const keyRgb = kr | (kg << 8) | (kb << 16);
  const out = new Uint32Array(dw * dh);
  // One horizontally processed source row.
  const hRow = (row: number, x: number): number => {
    const base = row * w;
    if (hMode === 'none') return src[base + xm.at[x]];
    const a = xm.at[x], e = xm.end[x];
    if (hMode === 'min') {
      // Lowest in-memory index = highest file index; the first one wins on ties.
      let best = a, bi = fidx![base + a];
      for (let s = a + 1; s < e; s++) if (fidx![base + s] > bi) { bi = fidx![base + s]; best = s; }
      return src[base + best];
    }
    const n = e - a;
    if (n === 1) return src[base + a];
    let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
    for (let s = a; s < e; s++) {
      const v = src[base + s];
      c0 += v & 255; c1 += (v >>> 8) & 255; c2 += (v >>> 16) & 255; c3 += v >>> 24;
    }
    return n === 2 ? ((c0 >> 1) | ((c1 >> 1) << 8) | ((c2 >> 1) << 16) | ((c3 >> 1) << 24)) >>> 0 : (Math.floor(c0 / n) | (Math.floor(c1 / n) << 8) | (Math.floor(c2 / n) << 16) | (Math.floor(c3 / n) << 24)) >>> 0;
  };
  for (let y = 0; y < dh; y++) {
    const r0 = ym.at[y], r1 = vAvg ? ym.end[y] : r0 + 1;
    for (let x = 0; x < dw; x++) {
      let v: number;
      if (r1 - r0 === 1) v = hRow(r0, x);
      else {
        let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
        for (let r = r0; r < r1; r++) {
          const q = hRow(r, x);
          c0 += q & 255; c1 += (q >>> 8) & 255; c2 += (q >>> 16) & 255; c3 += q >>> 24;
        }
        const n = r1 - r0;
        v = n === 2 ? ((c0 >> 1) | ((c1 >> 1) << 8) | ((c2 >> 1) << 16) | ((c3 >> 1) << 24)) >>> 0 : (Math.floor(c0 / n) | (Math.floor(c1 / n) << 8) | (Math.floor(c2 / n) << 16) | (Math.floor(c3 / n) << 24)) >>> 0;
      }
      let vis = true;
      if (matte && !matte[r0 * w + xm.at[x]]) vis = false;
      if (keyed && rgbKey(v) === keyRgb) vis = false;
      out[y * dw + x] = vis ? (v | 0xff000000) >>> 0 : 0;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, dw);
  canvas.height = Math.max(1, dh);
  const cctx = canvas.getContext('2d')!;
  const img = cctx.createImageData(canvas.width, canvas.height);
  new Uint32Array(img.data.buffer).set(out.subarray(0, canvas.width * canvas.height));
  cctx.putImageData(img, 0, 0);
  if (map.size > 32) map.clear();
  const res = { canvas, px: out };
  map.set(key, res);
  return res;
}

// A stretched blit whose source row overflows its temp buffer (rule 5 above): source pixels from index cap on
// (relative to the clipped row start) are read from the destination row buffer instead, i.e. from pixel
// i - cap of the same row as it stands at that point (already blended for a blend ink, the original
// destination for a copy ink). ending_interlace (1x289, matte, blend 30) stretched to the full 600 px width
// has room for 598 pixels, so its last two columns blend pixels 0 and 1 of the row instead of black (verified
// pixel for pixel on the ending, unlock_chain_3 t4476 on); with an update region starting at x = 1 only the
// last column does (t4536), and later updates (x 1..453) leave that column as it was.
function blitAliasedRow(ctx: CanvasRenderingContext2D, st: { px: Uint32Array }, plan: StretchPlan, raw: number, keyed: boolean, keyRgb: number): void {
  const c = plan.dstClip;
  const w = c.right - c.left, h = c.bottom - c.top;
  const dw = plan.dst.right - plan.dst.left;
  const img = ctx.getImageData(c.left, c.top, w, h);
  const px = new Uint32Array(img.data.buffer);
  const L = blendLevel(raw);
  const blendOn = raw > 0;
  const orig = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    orig.set(px.subarray(row, row + w));
    const sy = c.top + y - plan.dst.top;
    for (let i = 0; i < w; i++) {
      const sv = st.px[sy * dw + (c.left + i - plan.dst.left)];
      let s: number, vis: boolean;
      if (i < plan.cap) {
        s = sv;
        vis = sv >>> 24 !== 0;
      } else {
        s = blendOn ? px[row + i - plan.cap] : orig[i - plan.cap];
        vis = keyed ? rgbKey(s) !== keyRgb : sv >>> 24 !== 0;
      }
      if (!vis) continue;
      if (!blendOn) px[row + i] = (s | 0xff000000) >>> 0;
      else {
        const d = px[row + i];
        px[row + i] = (mix(s & 255, d & 255, L) | (mix((s >>> 8) & 255, (d >>> 8) & 255, L) << 8) | (mix((s >>> 16) & 255, (d >>> 16) & 255, L) << 16) | 0xff000000) >>> 0;
      }
    }
  }
  ctx.putImageData(img, c.left, c.top);
}

// ---------------------------------------------------------------- Director's texture-mapped (quad) blits

// Flipped and rotated bitmaps are not drawn by CopyBits' stretcher: Dirapi FUN_68084b92 hands Iml32 the sprite's
// quad (S+0xD8, see quadCorners) through Ordinal_1634 -> FUN_6902ac00 -> FUN_69001bf0, which rasterises it with
// FUN_6900e8d0 / FUN_6900da10 / FUN_6900dc90 / FUN_6900dd30 and point-samples the source with the 16.16 texture
// fetch FUN_6900d640 (8-bit; the same for every depth). A parallelogram quad (opposite sides within 5 %, always
// the case for a flipped or rotated rect, FUN_6900eeb0) takes the affine path below:
//  * corners: X = ftol((x + 0.5) * 65536 + 0.5) per coordinate (16.16, truncated), source corners (L,T) (R,T)
//    (R,B) (L,B) << 16 of the source rect (the whole member);
//  * scanlines start at the first corner with the smallest Y, row = Y >> 16; edge A walks the corners forwards,
//    edge B backwards; an edge from corner i to j covers n = (Yj - Yi + 0xffff) >> 16 rows (n = 0: next edge),
//    its source position steps by trunc((Sj - Si) / n) per row, its x starts at Xi >> 16 and steps by
//    Bresenham over dx = (Xj - Xi) >> 16;
//  * a row's span is [left x, right x) between the two edges; the source steps by trunc((Sright - Sleft) / w)
//    per pixel and starts half a step in (u: corner 1/2 edges with no u step start 0.5 px back; v: corner 2/3
//    edges with no v step likewise); the span is dropped when its first sample lies outside the source;
//  * every pixel takes the source pixel (u >> 16, v >> 16): no combining when shrinking (unlike CopyBits).
// The flipped, shrunk Starfire summon glow (summons_raven t1178-1181) is pixel-exact with this; unscaled flips
// come out as exact mirrors.
type QuadSpan = { y: number; x0: number; x1: number; u: number; du: number; v: number; dv: number };
type QuadEdge = { dir: number; count: number; start: number; end: number; u: number; v: number; du: number; dv: number; x: number; step: number; xdir: number; err: number; rem: number; denom: number };
const fixDiv = (a: number, b: number) => Math.trunc(a / b) | 0; // FUN_6900dc20: (a << 16) / (b << 16), truncated
function fixMul(a: number, b: number): number {
  // FUN_6900e8a0: (a * b + 0x8000) >> 16 in 64 bits
  return Number((BigInt(a) * BigInt(b) + 0x8000n) >> 16n) | 0;
}
function quadSpans(quad: number[], srcW: number, srcH: number, clip: IRect0): QuadSpan[] {
  const out: QuadSpan[] = [];
  const q = quad.map((v) => (v > 32000 ? 32000 : v < -32000 ? -32000 : v));
  const X = [0, 2, 4, 6].map((i) => Math.trunc((q[i] + 0.5) * 65536 + 0.5) | 0);
  const Y = [1, 3, 5, 7].map((i) => Math.trunc((q[i] + 0.5) * 65536 + 0.5) | 0);
  const SU = [0, srcW << 16, srcW << 16, 0];
  const SV = [0, 0, srcH << 16, srcH << 16];
  let top = 0, bottom = 0, minY = 0x7d000000, maxY = -0x7d000000;
  for (let i = 0; i < 4; i++) {
    if (Y[i] < minY) {
      minY = Y[i];
      top = i;
    }
    if (Y[i] > maxY) {
      maxY = Y[i];
      bottom = i;
    }
  }
  const setup = (e: QuadEdge, start: number): boolean => {
    if (start === bottom) return false;
    do {
      let next = e.dir + start;
      if (next >= 4) next = 0;
      else if (next < 0) next = 3;
      const n = (Y[next] - Y[start] + 0xffff) >> 16;
      e.count = n;
      if (n > 0) {
        e.end = next;
        e.start = start;
        e.u = SU[start];
        e.v = SV[start];
        e.du = fixDiv(SU[next] - e.u, n);
        e.dv = fixDiv(SV[next] - e.v, n);
        e.x = X[start] >> 16;
        let d = ((X[next] - X[start]) | 0) >> 16;
        if (d < 0) {
          e.xdir = -1;
          d = -d;
          e.err = 1 - n;
          e.step = -Math.trunc(d / n);
        } else {
          e.xdir = 1;
          e.step = Math.trunc(d / n);
          e.err = 0;
        }
        e.denom = n;
        e.rem = d % n;
        return true;
      }
      start = next;
    } while (start !== bottom);
    return false;
  };
  const step = (e: QuadEdge): boolean => {
    e.count--;
    if (e.count === 0) return setup(e, e.end);
    e.u = (e.u + e.du) | 0;
    e.v = (e.v + e.dv) | 0;
    const x0 = e.x;
    e.x = x0 + e.step;
    e.err += e.rem;
    if (e.err > 0) {
      e.x = e.xdir + x0 + e.step;
      e.err -= e.denom;
    }
    return true;
  };
  const mk = (dir: number): QuadEdge => ({ dir, count: 0, start: 0, end: 0, u: 0, v: 0, du: 0, dv: 0, x: 0, step: 0, xdir: 1, err: 0, rem: 0, denom: 1 });
  const A = mk(1), B = mk(-1);
  let row = minY >> 16;
  if (!setup(A, top) || !setup(B, top)) return out;
  while (row < clip.top) {
    row++;
    if (!step(A) || !step(B)) return out;
  }
  for (let rows = clip.bottom - row; rows > 0; rows--) {
    const [Le, Re] = A.x < B.x ? [A, B] : [B, A];
    let xl = Le.x, xr = Re.x;
    if (xr !== xl && clip.left < xr && xl < clip.right) {
      let u = Le.u, v = Le.v;
      const w = xr - xl;
      const du = fixDiv(Re.u - u, w);
      const dv = fixDiv(Re.v - v, w);
      const v23 = Le.start === 2 || Le.start === 3;
      const hv = v23 && dv === 0 ? Le.dv : dv;
      if (v23 && hv === 0) v -= 0x8000;
      else v += Math.trunc(hv / 2);
      const u12 = Le.start === 1 || Le.start === 2;
      const hu = u12 && du === 0 ? Le.du : du;
      if (u12 && hu === 0) u -= 0x8000;
      else u += Math.trunc(hu / 2);
      if (xl < clip.left) {
        u = (u + fixMul(du, (clip.left - xl) << 16)) | 0;
        v = (v + fixMul(dv, (clip.left - xl) << 16)) | 0;
        xl = clip.left;
      }
      if (clip.right < xr) xr = clip.right;
      if (u >= 0 && v >= 0 && u < SU[2] && v < SV[2]) out.push({ y: row, x0: xl, x1: xr, u, du, v, dv });
    }
    row++;
    if (!step(A) || !step(B)) return out;
  }
  return out;
}

type QuadImage = { canvas: HTMLCanvasElement; left: number; top: number; right: number; bottom: number };
const quadCache = new WeakMap<Member, Map<string, QuadImage | null>>();
// The sampled sprite image of a quad blit, as a canvas over the covered box (alpha 0 where the ink keys or masks).
function directorQuad(m: Member, quad: number[], ink: number, blendOn: boolean): QuadImage | null {
  const p = sourcePixels(m);
  if (!p) return null;
  const sw = stageW || 600, sh = stageH || 400;
  const key = `${quad.map((v) => Math.trunc((v + 0.5) * 65536 + 0.5)).join(',')}|${ink}|${blendOn ? 1 : 0}|${sw}x${sh}|${p.ver}`;
  let map = quadCache.get(m);
  if (!map) quadCache.set(m, (map = new Map()));
  const hit = map.get(key);
  if (hit !== undefined) return hit;
  const spans = quadSpans(quad, p.w, p.h, { left: 0, top: 0, right: sw, bottom: sh });
  let res: QuadImage | null = null;
  if (spans.length) {
    let left = Infinity, right = -Infinity;
    for (const sp of spans) {
      if (sp.x0 < left) left = sp.x0;
      if (sp.x1 > right) right = sp.x1;
    }
    const top = spans[0].y, bottom = spans[spans.length - 1].y + 1;
    const w = right - left, h = bottom - top;
    const keyed = ink === INK_BGTRANSPARENT;
    const masked = ink === INK_MATTE || ink === INK_NOTGHOST || (ink === INK_DARKEN && blendOn);
    const matte = masked ? matteMask(m, p) : null;
    const [kr, kg, kb] = m.keyColor;
    const keyRgb = kr | (kg << 8) | (kb << 16);
    const out = new Uint32Array(w * h);
    for (const sp of spans) {
      let u = sp.u, v = sp.v;
      let o = (sp.y - top) * w + (sp.x0 - left);
      for (let x = sp.x0; x < sp.x1; x++, o++) {
        const i = (v >> 16) * p.w + (u >> 16);
        u = (u + sp.du) | 0;
        v = (v + sp.dv) | 0;
        const c = p.rgba[i];
        if (matte && !matte[i]) continue;
        if (keyed && rgbKey(c) === keyRgb) continue;
        out[o] = (c | 0xff000000) >>> 0;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const cctx = canvas.getContext('2d')!;
    const img = cctx.createImageData(w, h);
    new Uint32Array(img.data.buffer).set(out);
    cctx.putImageData(img, 0, 0);
    res = { canvas, left, top, right, bottom };
  }
  if (map.size > 32) map.clear();
  map.set(key, res);
  return res;
}

function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite): void {
  const m = s.member;
  if (s.width === 0 || s.height === 0 || s.blend <= 0) return;
  const r = s.drawRect;
  // A 1-bit bitmap drawn with Background Transparent ink ignores the sprite's blend: its black pixels are
  // painted opaque. Verified on the select screen, where selection_bckgrnd.hard (1-bit, ink 36, blend 40)
  // is pure black in the original at every pixel it covers (1192/1192 at tick 330 of fighter_plasmus).
  // (1-bit members with Matte ink, e.g. the ending's slade_fader, are keyframed through blend levels, so
  // this is limited to ink 36.)
  const blend = m.type === 'bitmap' && m.depth === 1 && s.ink === INK_BGTRANSPARENT ? 0 : s.blendRaw;
  // Darken (41) with a blend is not a darken at all: Dirapi FUN_6806e4dc turns ink 41 into blit mode 0x1c and,
  // because the blend level is below 256, into the plain blend mode 10, and the renderer hands Iml32 the matte
  // mask of the bitmap (white pixels connected to the image edge, 4-neighbour flood fill), as for ink 8. So the
  // bitmap is blended where the matte mask is set and left out elsewhere: the Controls screen's controls_texture
  // (2-bit, blend 10) blends its black pixels and its enclosed white pixels toward black/white and leaves the
  // edge-connected white alone (menus_misc: 62491/62491 white pixels classified correctly, blit trace mask
  // 600x400x1). Only that blended use occurs; plain Darken keeps the multiply approximation.
  const darkenBlend = s.ink === INK_DARKEN && blend > 0;
  // 39 darkest -> darken; 41 darken -> multiply.
  const op: GlobalCompositeOperation = s.ink === INK_DARKEST ? 'darken' : s.ink === INK_DARKEN && !darkenBlend ? 'multiply' : 'source-over';
  if (m.type === 'text' || m.type === 'field') {
    blit(ctx, blend, op, r.left, r.top, r.right, r.bottom, (t) => textRenderer?.(t, s, r));
    return;
  }
  if (m.type === 'shape') {
    blit(ctx, blend, op, r.left, r.top, r.right, r.bottom, (t) => drawShape(t, m, s.foreColor, r.left, r.top, s.width, s.height));
    return;
  }
  // Film loop at natural size, unflipped, unrotated, without its own blend: its sub-sprites go straight onto
  // the stage.
  if (m.filmLoop && !s.rotation && !s.flipH && !s.flipV && blend === 0 && op === 'source-over' && s.width === m.width && s.height === m.height) {
    drawFilmLoopDirect(ctx, m, s.loopFrame, r.left, r.top);
    return;
  }
  // Stretched bitmap (unflipped, unrotated): Director's CopyBits rules (clip, mapping, shrink combining, buffer
  // overflow), see directorStretch.
  if (m.type === 'bitmap' && !m.filmLoop && !s.rotation && !s.flipH && !s.flipV && (s.width !== m.width || s.height !== m.height)) {
    const plan = planStretch({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }, m.width, m.height, curClip);
    if (!plan) return;
    const st = directorStretch(m, s.ink, blend > 0, plan);
    if (!st) return;
    if (s.ink === INK_NOTGHOST) {
      softBlend(ctx, r.left, r.top, r.right, r.bottom, 0, (t) => t.drawImage(st.canvas, r.left, r.top), true);
      return;
    }
    if (plan.cap < plan.dstClip.right - plan.dstClip.left && op === 'source-over') {
      const [kr, kg, kb] = m.keyColor;
      blitAliasedRow(ctx, st, plan, blend, s.ink === INK_BGTRANSPARENT, kr | (kg << 8) | (kb << 16));
      return;
    }
    blit(ctx, blend, op, r.left, r.top, r.right, r.bottom, (t) => t.drawImage(st.canvas, r.left, r.top));
    return;
  }
  // Flipped or rotated bitmap: Director's texture-mapped quad blit (see quadSpans).
  const quad = m.type === 'bitmap' && !m.filmLoop ? s.quad() : null;
  if (quad) {
    const qi = directorQuad(m, quad, s.ink, blend > 0);
    if (!qi) return;
    if (s.ink === INK_NOTGHOST) {
      softBlend(ctx, qi.left, qi.top, qi.right, qi.bottom, 0, (t) => t.drawImage(qi.canvas, qi.left, qi.top), true);
      return;
    }
    blit(ctx, blend, op, qi.left, qi.top, qi.right, qi.bottom, (t) => t.drawImage(qi.canvas, qi.left, qi.top));
    return;
  }
  // Not Ghost (7): blit mode 9 with the matte mask, dst = dst | src (Iml32 FUN_6900b2e0; menus_misc t345, the
  // select screen's button flash).
  if (s.ink === INK_NOTGHOST && m.type === 'bitmap' && !m.filmLoop && !s.rotation && !s.flipH && !s.flipV) {
    const mc = inkCanvas(m, INK_MATTE);
    if (mc) softBlend(ctx, r.left, r.top, r.right, r.bottom, 0, (t) => t.drawImage(mc, r.left, r.top), true);
    return;
  }
  const c0 = m.filmLoop ? filmLoopCanvas(m, s.loopFrame) : inkCanvas(m, darkenBlend ? INK_MATTE : s.ink);
  if (!c0) return;
  const c = s.rotation ? c0 : scaledCanvas(c0, s.width, s.height);
  if (s.rotation) {
    // Rotate (and flip) around the reg point, which sits at the sprite's loc.
    const sx = m.width ? s.width / m.width : 1;
    const sy = m.height ? s.height / m.height : 1;
    const q = s.rect;
    blit(ctx, blend, op, q.left - 1, q.top - 1, q.right + 1, q.bottom + 1, (t) => {
      t.save();
      t.translate(s.locH, s.locV);
      t.rotate((s.rotation * Math.PI) / 180);
      t.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
      t.drawImage(c, -m.regPoint.locH * sx, -m.regPoint.locV * sy, s.width, s.height);
      t.restore();
    });
  } else if (s.flipH || s.flipV) {
    blit(ctx, blend, op, r.left, r.top, r.right, r.bottom, (t) => {
      t.save();
      t.translate(s.flipH ? r.right : r.left, s.flipV ? r.bottom : r.top);
      t.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
      t.drawImage(c, 0, 0, s.width, s.height);
      t.restore();
    });
  } else {
    blit(ctx, blend, op, r.left, r.top, r.right, r.bottom, (t) => t.drawImage(c, r.left, r.top, s.width, s.height));
  }
}

// Pixel-accurate hit test for mouse events (transparent ink pixels do not count).
export function spriteHit(s: Sprite, x: number, y: number): boolean {
  const r = s.drawRect;
  if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
  const m = s.member;
  if (m.type !== 'bitmap') return true;
  const c = inkCanvas(m, s.ink);
  if (!c) return true;
  let px = Math.floor(((x - r.left) / s.width) * c.width);
  let py = Math.floor(((y - r.top) / s.height) * c.height);
  if (s.flipH) px = c.width - 1 - px;
  if (s.flipV) py = c.height - 1 - py;
  const a = c.getContext('2d', { willReadFrequently: true })!.getImageData(px, py, 1, 1).data[3];
  return a > 0;
}

export { LImage };
