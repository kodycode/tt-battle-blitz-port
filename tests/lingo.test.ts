// Lingo value semantics the port depends on.
import { describe, expect, it } from 'vitest';
import { idiv, integer, LList, list, point, rect, random, setRandomSeed, getRandomSeed, bitXor } from '../src/runtime/lingo';
import { lingoMe } from '../src/runtime/ancestor';

describe('numbers', () => {
  it('integer division truncates toward zero like Lingo int/int', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(idiv(-7, 2)).toBe(-3);
    expect(idiv(400, 14)).toBe(28); // Fighter hover table step
  });

  it('integer() rounds halves away from zero', () => {
    expect(integer(2.5)).toBe(3);
    expect(integer(-2.5)).toBe(-3);
    expect(integer(1000 * 0.2)).toBe(200); // HEALTH_ENRAGED_THRESHOLD
    expect(integer(100 * 2.55)).toBe(255); // AudioManager volume scale
  });

  it('random(n) stays in 1..n and is reproducible with a seed', () => {
    setRandomSeed(42);
    const a = Array.from({ length: 200 }, () => random(7));
    setRandomSeed(42);
    const b = Array.from({ length: 200 }, () => random(7));
    expect(a).toEqual(b);
    expect(Math.min(...a)).toBe(1);
    expect(Math.max(...a)).toBe(7);
  });

  // Golden values captured from Dirapi.dll's RNG inside the original Projector.exe (docs/DIRECTOR_INTERNALS.md §1).
  it('random(n) matches Director MX 2004 bit-exactly', () => {
    setRandomSeed(12345);
    expect(Array.from({ length: 24 }, () => random(10))).toEqual([7, 6, 1, 1, 2, 8, 7, 8, 6, 6, 5, 3, 5, 3, 7, 4, 4, 1, 3, 5, 10, 8, 4, 9]);
    setRandomSeed(-559038737);
    expect(Array.from({ length: 16 }, () => random(1000))).toEqual([294, 49, 933, 405, 462, 596, 762, 659, 444, 670, 270, 391, 855, 405, 231, 303]);
    setRandomSeed(1);
    expect(Array.from({ length: 12 }, () => random(7))).toEqual([6, 1, 3, 2, 7, 1, 1, 4, 4, 6, 6, 4]);
  });

  it('randomSeed: seed 0 acts like 1, the seed reads back the LFSR state, n <= 0 gives the raw hash', () => {
    setRandomSeed(0);
    expect(Array.from({ length: 12 }, () => random(100))).toEqual([55, 81, 90, 34, 39, 35, 38, 61, 75, 13, 8, 73]);
    setRandomSeed(12345);
    expect(getRandomSeed()).toBe(12345);
    expect(random(0)).toBe(1342973807);
    expect(getRandomSeed()).toBe(2734692380 | 0);
    expect(random(-5)).toBe(-2116613592);
    // Saving and restoring the seed replays the sequence.
    const s = getRandomSeed();
    const a = [random(50), random(50)];
    setRandomSeed(s);
    expect([random(50), random(50)]).toEqual(a);
  });

  it('random(a, b) is a..b inclusive and falls back to random(a) when b <= a', () => {
    setRandomSeed(12345);
    const r = Array.from({ length: 24 }, () => random(5, 14));
    expect(r).toEqual([7, 6, 1, 1, 2, 8, 7, 8, 6, 6, 5, 3, 5, 3, 7, 4, 4, 1, 3, 5, 10, 8, 4, 9].map((v) => v + 4));
    setRandomSeed(12345);
    expect(random(10, 3)).toBe(7);
  });

  it('bitXor accepts Lingo booleans', () => {
    expect(bitXor(true, 0)).toBe(1);
    expect(bitXor(true, 1)).toBe(0);
  });
});

describe('lists', () => {
  it('are 1-based and pad with 0 when set past the end', () => {
    const l = new LList<number>();
    l.set(3, 9);
    expect(l.count).toBe(3);
    expect(l.get(1)).toBe(0);
    expect(l.get(3)).toBe(9);
  });

  it('getPos is 1-based and 0 when absent', () => {
    const l = list('a', 'b');
    expect(l.getPos('b')).toBe(2);
    expect(l.getPos('z')).toBe(0);
  });

  it('iterate over a snapshot (repeat with o in list)', () => {
    const l = list(1, 2, 3);
    const seen: number[] = [];
    for (const v of l) {
      seen.push(v);
      if (v === 1) l.deleteAt(1);
    }
    expect(seen).toEqual([1, 2, 3]);
  });
});

describe('points and rects', () => {
  it('points are shared references, arithmetic makes new ones', () => {
    const a = point(1, 2);
    const b = a;
    b.locH = 5;
    expect(a.locH).toBe(5);
    const c = a.add(point(1, 1));
    expect(c).not.toBe(a);
    expect(c.equals(point(6, 3))).toBe(true);
  });

  it('intersect returns rect(0,0,0,0) when disjoint', () => {
    expect(rect(0, 0, 10, 10).intersect(rect(20, 20, 30, 30)).isZero()).toBe(true);
    expect(rect(0, 0, 10, 10).intersect(rect(5, 5, 30, 30)).equals(rect(5, 5, 10, 10))).toBe(true);
    // Touching edges do not overlap.
    expect(rect(0, 0, 10, 10).intersect(rect(10, 0, 20, 10)).isZero()).toBe(true);
  });

  it('member rect minus reg point gives the reg-relative box (Move.getAttackRect)', () => {
    const p = point(46, 73);
    expect(rect(0, 0, 95, 81).sub(rect(p, p)).equals(rect(-46, -73, 49, 8))).toBe(true);
  });

  it('rects hold integers: float coordinates round half away from zero (points keep floats)', () => {
    expect(rect(1.5, -1.5, 2.4, -2.6).equals(rect(2, -2, 2, -3))).toBe(true);
    expect(rect(-10, 0, 10, 20).offset(-560.0126, 0.5).equals(rect(-570, 1, -550, 21))).toBe(true);
    expect(rect(point(-755.4, 0), point(-755.4, 0)).left).toBe(-755);
    expect(point(1.5, -2.25).locH).toBe(1.5);
  });

  it('inside is right/bottom exclusive', () => {
    expect(point(9, 9).inside(rect(0, 0, 10, 10))).toBe(true);
    expect(point(10, 5).inside(rect(0, 0, 10, 10))).toBe(false);
  });
});

describe('ancestor dispatch (lingoMe)', () => {
  class Base {
    calls: string[] = [];
    run(): void {
      const me = lingoMe(this, Base, 'run');
      me.step();
    }
    step(): void {
      this.calls.push('base');
    }
  }
  class Child extends Base {
    step(): void {
      this.calls.push('child');
    }
  }
  class ChildCallsAncestor extends Base {
    run(): void {
      super.run();
    }
    step(): void {
      this.calls.push('child');
    }
  }

  it('passed messages keep me = child (virtual dispatch)', () => {
    const c = new Child();
    c.calls = [];
    c.run();
    expect(c.calls).toEqual(['child']);
  });

  it('explicit ancestor.run() makes me = ancestor, so the base step runs', () => {
    const c = new ChildCallsAncestor();
    c.calls = [];
    c.run();
    expect(c.calls).toEqual(['base']);
  });
});
