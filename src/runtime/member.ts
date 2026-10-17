// Cast libraries and members.
import { Point, Rect } from './lingo';

export type FilmLoopState = {
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
  flipH?: boolean;
  flipV?: boolean;
  stretch?: boolean;
  rotation?: number;
  foreColor?: string | number;
  backColor?: string | number;
};
export type FilmLoopData = {
  rect: [number, number, number, number];
  loops: boolean;
  frameCount: number;
  sprites: { channel: number; startFrame: number; endFrame: number; states: FilmLoopState[] }[];
};

export interface SoundRegion {
  sampleRate: number; // Hz of the counts below (22050)
  sampleCount: number; // Director's sound length (snd header numFrames)
  skipSamples: number; // decoded samples Director drops before sample 0
  mpegSamples: number; // samples the MP3 decodes to (frames * 576)
}

export type MemberType ='empty' | 'bitmap' | 'sound' | 'text' | 'field' | 'script' | 'shape' | 'palette' | 'filmloop' | 'flash' | 'other';

// Off-screen pixel buffer standing in for a Lingo image object.
export class LImage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  version = 0; // bumped on every change so cached ink variants are rebuilt

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false; // Director's copyPixels scales by pixel replication
  }

  get width(): number {
    return this.canvas.width;
  }
  get height(): number {
    return this.canvas.height;
  }
  get rect(): Rect {
    return new Rect(0, 0, this.width, this.height);
  }

  static fromSource(src: CanvasImageSource, width: number, height: number): LImage {
    const img = new LImage(width, height);
    img.ctx.drawImage(src, 0, 0);
    return img;
  }

  // A 32-bit bitmap whose "use alpha" flag is off: Director draws its RGB and ignores the alpha channel
  // (win_screen endtext_score has alpha 0 everywhere, yet the original shows the "SCORE" label, keyed by ink
  // 36). A 2D canvas premultiplies on upload, losing the RGB of transparent pixels, so the PNG is decoded with
  // premultiplyAlpha 'none' and read back through WebGL, then stored opaque.
  // 2-bit bitmaps on a system palette: Director shows their four indices as white, light grey, dark grey and
  // black (255, 170, 85, 0), while the extracted PNGs took palette entries 0/85/170/255 (systemMac 85 =
  // #9999cc, 170 = #333399). Only the select screen's bg_head_starfire uses the middle indices (35 pixels);
  // verified against the projector's pixels through the sprite's 30% blend.
  static fixTwoBitSystemColors(img: LImage, system: string): void {
    if (system !== 'systemMac') return;
    const d = img.ctx.getImageData(0, 0, img.width, img.height);
    const p = d.data;
    let changed = false;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i] === 153 && p[i + 1] === 153 && p[i + 2] === 204) {
        p[i] = p[i + 1] = p[i + 2] = 170;
        changed = true;
      } else if (p[i] === 51 && p[i + 1] === 51 && p[i + 2] === 153) {
        p[i] = p[i + 1] = p[i + 2] = 85;
        changed = true;
      }
    }
    if (changed) img.ctx.putImageData(d, 0, 0);
  }

  // Raw RGBA pixels (the extractor's bitmaps). ignoreAlpha: as decodeIgnoringAlpha, stored opaque.
  static fromRGBA(width: number, height: number, rgba: Uint8ClampedArray, ignoreAlpha = false): LImage {
    const img = new LImage(width, height);
    if (width <= 0 || height <= 0) return img;
    let px = rgba;
    if (ignoreAlpha) {
      px = new Uint8ClampedArray(rgba);
      for (let i = 3; i < px.length; i += 4) px[i] = 255;
    }
    img.ctx.putImageData(new ImageData(px, width, height), 0, 0);
    return img;
  }

  static async decodeIgnoringAlpha(url: string): Promise<LImage | null> {
    try {
      const blob = await (await fetch(url)).blob();
      const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const w = bmp.width, h = bmp.height;
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return null;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let i = 3; i < px.length; i += 4) px[i] = 255;
      const img = new LImage(w, h);
      img.ctx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
      return img;
    } catch {
      return null;
    }
  }

  duplicate(): LImage {
    const img = new LImage(this.width, this.height);
    img.ctx.drawImage(this.canvas, 0, 0);
    return img;
  }

  // image.copyPixels(src, destRect, srcRect): plain copy (no ink options are used by the game).
  copyPixels(src: LImage, destRect: Rect, srcRect: Rect): void {
    if (srcRect.width <= 0 || srcRect.height <= 0 || destRect.width <= 0 || destRect.height <= 0) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'copy';
    this.ctx.beginPath();
    this.ctx.rect(destRect.left, destRect.top, destRect.width, destRect.height);
    this.ctx.clip();
    this.ctx.drawImage(src.canvas, srcRect.left, srcRect.top, srcRect.width, srcRect.height, destRect.left, destRect.top, destRect.width, destRect.height);
    this.ctx.restore();
    this.version++;
  }

  fill(r: Rect, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(r.left, r.top, r.width, r.height);
    this.version++;
  }
}

export class Member {
  number: number; // member number within its cast library (0 = no member)
  castLibNum: number;
  name: string;
  type: MemberType;
  width = 0;
  height = 0;
  regPoint: Point = new Point(0, 0);
  depth = 0;
  url: string | null = null; // bitmap PNG or sound file
  loop = false;
  private _image: LImage | null = null;
  private _text = '';
  textInfo: Record<string, unknown> | null = null;
  version = 0; // bumped when image/text changes
  sound: AudioBuffer | null = null; // decoded by the audio module
  // Sound members: Director's play region inside the decoded MP3 (casts.json sampleRate/sampleCount/
  // skipSamples/mpegSamples, see docs/DATA_FORMAT.md, type = sound). null = play the whole decoded file.
  soundRegion: SoundRegion | null = null;
  // Film loop contents (score.json sprite-span format), see docs/DATA_FORMAT.md.
  filmLoop: FilmLoopData | null = null;
  // Colour keyed by inks 8/36 when palette index 0 is not white (Jinx energy-ball frames).
  keyColor: [number, number, number] = [255, 255, 255];

  constructor(number: number, castLibNum: number, name: string, type: MemberType) {
    this.number = number;
    this.castLibNum = castLibNum;
    this.name = name;
    this.type = type;
  }

  // Lingo member.rect for a bitmap: rect(0, 0, width, height).
  get rect(): Rect {
    return new Rect(0, 0, this.width, this.height);
  }

  get image(): LImage {
    if (!this._image) this._image = new LImage(this.width || 1, this.height || 1);
    return this._image;
  }
  set image(img: LImage) {
    this._image = img;
    this.width = img.width;
    this.height = img.height;
    this.version++;
  }
  hasImage(): boolean {
    return this._image !== null;
  }
  setLoadedImage(img: LImage): void {
    this._image = img;
  }

  get text(): string {
    return this._text;
  }
  set text(s: string) {
    this._text = s;
    this.version++;
  }

  // member.erase(): turn a scratch member back into an empty one.
  erase(): void {
    this._image = null;
    this.width = 0;
    this.height = 0;
    this.type = 'empty';
    this.version++;
  }

  get castLib(): number {
    return this.castLibNum;
  }

  toString(): string {
    return `(member ${this.number} of castLib ${this.castLibNum})`;
  }
}

export class CastLib {
  number: number;
  name: string;
  fileName: string;
  members: Map<number, Member> = new Map();
  byName: Map<string, Member> = new Map();

  constructor(number: number, name: string, fileName: string) {
    this.number = number;
    this.name = name;
    this.fileName = fileName;
  }

  add(m: Member): void {
    this.members.set(m.number, m);
    // Lingo member-name lookup is case-insensitive; the first member with a name wins.
    const key = m.name.toLowerCase();
    if (m.name && !this.byName.has(key)) this.byName.set(key, m);
  }
}

export const MEMBER_EMPTY = new Member(0, 0, '', 'empty');

const castLibs: CastLib[] = []; // index = castLib number
const castLibsByName: Map<string, CastLib> = new Map();

export function registerCastLib(c: CastLib): void {
  castLibs[c.number] = c;
  castLibsByName.set(c.name.toLowerCase(), c);
}

export function allCastLibs(): CastLib[] {
  return castLibs.filter(Boolean);
}

function resolveCast(cast: string | number | undefined): CastLib | null {
  if (cast === undefined || cast === null) return null;
  if (typeof cast === 'number') return castLibs[cast] || null;
  return castLibsByName.get(cast.toLowerCase()) || null;
}

// castLib(name or number). `.number` is 0 for an unknown cast.
export function castLib(cast: string | number): { number: number; name: string } {
  const c = resolveCast(cast);
  return c ? c : { number: 0, name: '' };
}

// member(nameOrNumber, castNameOrNumber). Without a cast, searches every cast library in order.
// Returns MEMBER_EMPTY (number 0) when not found, like Lingo's member with number <= 0.
export function member(id: string | number, cast?: string | number): Member {
  if (typeof id === 'number' && id <= 0) return MEMBER_EMPTY;
  const libs = cast === undefined ? allCastLibs() : [resolveCast(cast)].filter(Boolean) as CastLib[];
  for (const c of libs) {
    const m = typeof id === 'number' ? c.members.get(id) : c.byName.get(id.toLowerCase());
    if (m) return m;
  }
  return MEMBER_EMPTY;
}
