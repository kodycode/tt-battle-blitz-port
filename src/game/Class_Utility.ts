import { member, Member, MEMBER_EMPTY, LList, integer, charToNum, numToChar } from '../runtime';

export class Class_Utility {
  constructor() {}

  destroy(): undefined {
    return undefined;
  }

  newArray<T = any>(size: number, val: T): LList<T> {
    const l = new LList<T>();
    for (let i = 1; i <= size; i++) l.append(val);
    return l;
  }

  findMember(memName: string, memCast?: string | number): Member {
    // External cast linking (see linkExternalCast): a member of a still-unlinked external cast is not found.
    if (typeof memCast === 'string' && Class_Utility.isUnlinkedExternalCast(memCast)) return MEMBER_EMPTY;
    const mem = member(memName, memCast);
    if (mem.number > 0) return mem;
    return MEMBER_EMPTY;
  }

  // Emulation of Director's external cast linking (TODO(runtime): `castLib(n).fileName = path`, then this
  // belongs in the runtime's member lookup). game.dcr ships its external castLibs char_<Fighter> and
  // char_shared linked to the empty placeholder casts empty_<Fighter>.cct / empty_shared.cct (DEBUG.ls
  // unlinkCasts), so `member(name, "char_Raven")` finds nothing until Class_VersusScreen.linkCasts points the
  // castLib at the real file. Only the titan's, the villain's and the shared cast are ever linked, so e.g. in
  // Robin vs Jinx every g.assets.RAVEN member stays member(0): the Raven summon's
  // RavenFallingObjectsProjectile (attack mask g.assets.RAVEN.FX_RAVEN_FALLING_OBJECTS_01A) then has an empty
  // attack box and never hits (original: summons_robin 775, walk_cross 930).
  static linkedExternalCasts: Set<string> = new Set();

  static isUnlinkedExternalCast(castName: string): boolean {
    const n = castName.toLowerCase();
    return n.startsWith('char_') && !Class_Utility.linkedExternalCasts.has(n);
  }

  linkExternalCast(castName: string): void {
    Class_Utility.linkedExternalCasts.add(String(castName).toLowerCase());
  }

  toUpper(s: string): string {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = charToNum(s[i]);
      out += c >= 97 && c <= 122 ? numToChar(c - 32) : s[i];
    }
    return out;
  }

  isLetter(c: string): boolean {
    const i = charToNum(c);
    return (i >= 97 && i <= 122) || (i >= 65 && i <= 90);
  }

  ceiling(f: number): number {
    const i = integer(f);
    if (i === f) return i;
    if (f > 0.0) return integer(f + 0.5);
    if (f < 0.0) return integer(f - 0.5);
    return 0;
  }

  sameSigns(i1: number, i2: number): number {
    if (i1 < 0 && i2 < 0) return 1;
    if (i1 > 0 && i2 > 0) return 1;
    return 0;
  }

  // retList is a 1-based list of 2 numbers that receives the intersection point.
  getLineIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, retList: LList<number>): number {
    let x1lo: number, x1hi: number, y1lo: number, y1hi: number;
    const Ax = x2 - x1;
    const Bx = x3 - x4;
    if (Ax < 0) {
      x1lo = x2;
      x1hi = x1;
    } else {
      x1lo = x1;
      x1hi = x2;
    }
    if (Bx > 0) {
      if (x1hi < x4 || x3 < x1lo) return 0;
    } else {
      if (x1hi < x3 || x4 < x1lo) return 0;
    }
    const Ay = y2 - y1;
    const By = y3 - y4;
    if (Ay < 0) {
      y1lo = y2;
      y1hi = y1;
    } else {
      y1hi = y2;
      y1lo = y1;
    }
    if (By > 0) {
      if (y1hi < y4 || y3 < y1lo) return 0;
    } else {
      if (y1hi < y3 || y4 < y1lo) return 0;
    }
    const Cx = x1 - x3;
    const Cy = y1 - y3;
    const d = By * Cx - Bx * Cy;
    const f = Ay * Bx - Ax * By;
    if (f > 0) {
      if (d < 0 || d > f) return 0;
    } else {
      if (d > 0 || d < f) return 0;
    }
    const e = Ax * Cy - Ay * Cx;
    if (f > 0) {
      if (e < 0 || e > f) return 0;
    } else {
      if (e > 0 || e < f) return 0;
    }
    if (f === 0) return 0;
    // All inputs are floats in practice (positions are floats), so this is float division as in Lingo.
    retList.set(1, x1 + (d * Ax) / f);
    retList.set(2, y1 + (d * Ay) / f);
    return 1;
  }
}
