// Lingo value types and built-in functions, with Director 8 semantics where they matter for gameplay.
// Points and rects are mutable reference objects, as in Lingo: `a = b` shares, `a.locH = x` mutates.

export class Point {
  constructor(public locH: number, public locV: number) {}

  add(p: Point): Point {
    return new Point(this.locH + p.locH, this.locV + p.locV);
  }
  sub(p: Point): Point {
    return new Point(this.locH - p.locH, this.locV - p.locV);
  }
  mul(n: number): Point {
    return new Point(this.locH * n, this.locV * n);
  }
  // Float division. Lingo divides integer points by an integer with integer division: use idiv() then.
  div(n: number): Point {
    return new Point(this.locH / n, this.locV / n);
  }
  idiv(n: number): Point {
    return new Point(idiv(this.locH, n), idiv(this.locV, n));
  }
  neg(): Point {
    return new Point(-this.locH, -this.locV);
  }
  duplicate(): Point {
    return new Point(this.locH, this.locV);
  }
  equals(p: Point): boolean {
    return this.locH === p.locH && this.locV === p.locV;
  }
  // Lingo point.inside(rect): left/top inclusive, right/bottom exclusive.
  inside(r: Rect): boolean {
    return this.locH >= r.left && this.locH < r.right && this.locV >= r.top && this.locV < r.bottom;
  }
  toString(): string {
    return `point(${this.locH}, ${this.locV})`;
  }
}

export function point(h: number, v: number): Point {
  return new Point(h, v);
}

// Director rects hold integers only (unlike points, which keep floats): every rect value, including the
// results of offset/intersect/arithmetic, has its coordinates coerced like integer() (round half away from
// zero). Verified against the projector's sprite locs on the fight camera, which goes through
// `viewOriginRect + rect(viewCenter, viewCenter)`, and it decides fighter overlap pushes (defense boxes are
// `rect.offset(floatX, floatY)`) and so fighter positions and the AI.
export class Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  constructor(left: number, top: number, right: number, bottom: number) {
    this.left = integer(left);
    this.top = integer(top);
    this.right = integer(right);
    this.bottom = integer(bottom);
  }

  get width(): number {
    return this.right - this.left;
  }
  get height(): number {
    return this.bottom - this.top;
  }
  // Director coerces offset()'s h and v to integers (integer(): half away from zero) before adding.
  offset(h: number, v: number): Rect {
    h = integer(h);
    v = integer(v);
    return new Rect(this.left + h, this.top + v, this.right + h, this.bottom + v);
  }
  add(r: Rect): Rect {
    return new Rect(this.left + r.left, this.top + r.top, this.right + r.right, this.bottom + r.bottom);
  }
  sub(r: Rect): Rect {
    return new Rect(this.left - r.left, this.top - r.top, this.right - r.right, this.bottom - r.bottom);
  }
  mul(n: number): Rect {
    return new Rect(this.left * n, this.top * n, this.right * n, this.bottom * n);
  }
  // Lingo rect.intersect: rect(0,0,0,0) when the rects do not overlap.
  intersect(r: Rect): Rect {
    const l = Math.max(this.left, r.left);
    const t = Math.max(this.top, r.top);
    const rr = Math.min(this.right, r.right);
    const b = Math.min(this.bottom, r.bottom);
    if (rr <= l || b <= t) return new Rect(0, 0, 0, 0);
    return new Rect(l, t, rr, b);
  }
  union(r: Rect): Rect {
    return new Rect(Math.min(this.left, r.left), Math.min(this.top, r.top), Math.max(this.right, r.right), Math.max(this.bottom, r.bottom));
  }
  // Same integer coercion of the arguments as offset().
  inflate(h: number, v: number): Rect {
    h = integer(h);
    v = integer(v);
    return new Rect(this.left - h, this.top - v, this.right + h, this.bottom + v);
  }
  inside(r: Rect): boolean {
    return this.left >= r.left && this.top >= r.top && this.right <= r.right && this.bottom <= r.bottom;
  }
  equals(r: Rect): boolean {
    return this.left === r.left && this.top === r.top && this.right === r.right && this.bottom === r.bottom;
  }
  // True for rect(0,0,0,0): the Lingo idiom `r.intersect(x) <> RECT_0` becomes `!r.intersect(x).isZero()`.
  isZero(): boolean {
    return this.left === 0 && this.top === 0 && this.right === 0 && this.bottom === 0;
  }
  duplicate(): Rect {
    return new Rect(this.left, this.top, this.right, this.bottom);
  }
  toString(): string {
    return `rect(${this.left}, ${this.top}, ${this.right}, ${this.bottom})`;
  }
}

// rect(l, t, r, b) or rect(point, point)
export function rect(a: number | Point, b: number | Point, c?: number, d?: number): Rect {
  if (a instanceof Point && b instanceof Point) return new Rect(a.locH, a.locV, b.locH, b.locV);
  return new Rect(a as number, b as number, c as number, d as number);
}

// ---------------------------------------------------------------- 1-based linear list

// Lingo linear list, 1-based. Setting past the end pads with 0, like Lingo.
export class LList<T = any> {
  items: T[];
  constructor(items?: T[]) {
    this.items = items ? items : [];
  }
  get count(): number {
    return this.items.length;
  }
  get(i: number): T {
    return this.items[i - 1];
  }
  set(i: number, v: T): void {
    while (this.items.length < i - 1) this.items.push(0 as any);
    this.items[i - 1] = v;
  }
  append(v: T): void {
    this.items.push(v);
  }
  add(v: T): void {
    this.items.push(v);
  }
  deleteAt(i: number): void {
    this.items.splice(i - 1, 1);
  }
  deleteOne(v: T): void {
    const i = this.items.indexOf(v);
    if (i >= 0) this.items.splice(i, 1);
  }
  // 1-based position, 0 if absent.
  getPos(v: T): number {
    return this.items.indexOf(v) + 1;
  }
  getOne(v: T): number {
    return this.getPos(v);
  }
  getLast(): T {
    return this.items[this.items.length - 1];
  }
  addAt(i: number, v: T): void {
    this.items.splice(i - 1, 0, v);
  }
  duplicate(): LList<T> {
    return new LList(this.items.slice());
  }
  sort(): void {
    this.items.sort((a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0));
  }
  [Symbol.iterator](): Iterator<T> {
    // Iterate over a snapshot, like `repeat with o in list`.
    return this.items.slice()[Symbol.iterator]();
  }
}

export function list<T = any>(...items: T[]): LList<T> {
  return new LList(items);
}

// ---------------------------------------------------------------- numbers

// Integer division with Lingo semantics (both operands integers): truncates toward zero.
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

// Lingo `mod`: result takes the sign of the dividend, same as JS %.
export function mod(a: number, b: number): number {
  return a % b;
}

// Lingo integer(): rounds to nearest, halves away from zero.
export function integer(x: number): number {
  if (typeof x !== 'number' || Number.isNaN(x)) return 0;
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

export function float(x: number): number {
  return Number(x);
}

export function abs(x: number): number {
  return Math.abs(x);
}

export function bitAnd(a: number, b: number): number {
  return a & b;
}
export function bitOr(a: number, b: number): number {
  return a | b;
}
export function bitXor(a: number | boolean, b: number | boolean): number {
  return (Number(a) ^ Number(b)) & 0xffffffff;
}
export function bitNot(a: number): number {
  return ~a;
}

// Booleans as Lingo integers (1/0), for code that does arithmetic on comparisons.
export function b2i(b: boolean | number): number {
  return b ? 1 : 0;
}

export function voidp(v: unknown): boolean {
  return v === undefined || v === null;
}

export function objectp(v: unknown): boolean {
  return v !== undefined && v !== null && typeof v === 'object';
}

export function integerp(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v);
}

export function listp(v: unknown): boolean {
  return v instanceof LList || Array.isArray(v);
}

// ---------------------------------------------------------------- random

// Director MX 2004's own RNG, bit-exact (see docs/DIRECTOR_INTERNALS.md section 1): a 32-bit Galois LFSR
// (taps 0xA3000000) whose state goes through an integer hash. `the randomSeed` is the LFSR state.
const RNG_POLY = 0xa3000000;
let rngState = 0; // u32
let rngPoly = 0; // u32, set by rngInit()

function rngInit(): void {
  rngState = 1;
  rngPoly = RNG_POLY;
}

// Iml32 Ordinal_1051. All arithmetic mod 2^32, `>>` is arithmetic like the x86 SAR.
function rngHash(x: number): number {
  x |= 0;
  const a = (((x << 13) ^ x) - (x >> 21)) | 0;
  let b = (Math.imul((Math.imul(Math.imul(a, a), 0x3d73) + 0xc0ae5) | 0, a) - 0x2df722f3) & 0x7fffffff;
  b = (b + a) | 0;
  return (((b << 13) ^ b) - (b >> 21)) | 0;
}

// Dirapi RandomCore (0x6800992B): 0..n-1 for n > 0, the raw hash (any int32) for n <= 0.
function randomCore(n: number): number {
  if (rngState === 0) rngInit();
  rngState = (rngState & 1 ? (rngState >>> 1) ^ rngPoly : rngState >>> 1) >>> 0;
  const h = rngHash(Math.imul(rngState, 0x47));
  return n > 0 ? (h & 0x7fffffff) % n : h;
}

// Seed with the time at startup, as Director does (time(NULL) + the ticks); harnesses call setRandomSeed.
setRandomSeed(Math.floor(Date.now() / 1000) + Math.round((performance.now() * 60) / 1000));

// `the randomSeed = seed`: re-initialises the LFSR; seed 0 acts like 1.
export function setRandomSeed(seed: number): void {
  rngInit();
  seed = integer(seed) | 0;
  if (seed !== 0) rngState = seed >>> 0;
}

// `the randomSeed` (current LFSR state, as a signed Lingo integer).
export function getRandomSeed(): number {
  return rngState | 0;
}

// Debug aid (off by default): when `on`, every random() call appends its caller stack to `log`
// (test mode exposes it per tick with ?rngtrace=1).
export const rngTrace = { on: false, log: [] as string[] };

// Lingo random(n): 1..n; random(a, b): a..b (when a < b, else same as random(a)). Every call advances
// the generator once. n <= 0 gives an arbitrary integer, like Director. Float args are rounded like integer().
export function random(a: number, b?: number): number {
  if (rngTrace.on) rngTrace.log.push(`random(${a}${b === undefined ? '' : ', ' + b}) ${new Error().stack?.split('\n').slice(2, 7).map((s) => s.trim().replace(/\(http[^)]*\/src\//, '(')).join(' < ')}`);
  a = integer(a) | 0;
  const hi = b === undefined ? a : integer(b) | 0;
  if (a < hi) return (randomCore(hi - a + 1) + a) | 0;
  return (randomCore(a) + 1) | 0;
}

// ---------------------------------------------------------------- strings

export function string(v: unknown): string {
  return String(v);
}

export function charToNum(c: string): number {
  return c.length ? c.charCodeAt(0) : 0;
}

export function numToChar(n: number): string {
  return String.fromCharCode(n);
}

export function nothing(): void {}
