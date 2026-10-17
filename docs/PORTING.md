# Porting Lingo to TypeScript

`src/game/` is a faithful, behaviour-identical port of the game's Lingo. The decompiled Lingo it is translated from
(ProjectorRays output, see [research/README.md](../research/README.md)) is kept locally in
`local/decompiled/game/casts/<cast>/*.ls`; the `.lasm` next to each file is the bytecode, useful when the decompiled
source looks wrong. Original bugs are ported as they are; logic, timings and numbers are never "improved". Notable
original bugs are marked with `// ORIGINAL BUG:`.

Reference ports to copy the style of: `src/game/Class_Fighter.ts`, `Class_Move.ts`, `Class_Projectile.ts`,
`Class_Effect.ts`, `Class_RobinStand.ts`, `Class_RobinPunch.ts`, `Class_RobinJump.ts`, `Class_RobinKeyAdapter.ts`.
Runtime API: `src/runtime/*.ts` (import everything from `'../runtime'`).

## Files and classes
- One file per Lingo script: `src/game/<ScriptName>.ts` exporting `class <ScriptName>` — the script name
  is the part after `ParentScript 123 - ` / `BehaviorScript 45 - ` (e.g. `Class_RobinKick`, `Behavior_TitleScreen`).
- Never instantiate another game class through an import. Use the registry like Lingo does:
  `new(g.classes.Class_X, a, b)` → `new g.classes.Class_X(a, b)`. Only import a base class you `extends`,
  and use `import type` for type-only imports. (This avoids ES-module cycles.)
- After adding files run `python -I scripts/gen_classes.py src/game` to refresh `classes.ts`.

## Classes, constructors, ancestors
- `on new me, a, b` → `constructor(a, b)`; `ancestor = new(g.classes.Class_Base, x, y)` → `super(x, y)` as the
  first statement. Drop `return me`.
- **No field initializers** (`foo = 0` in the class body). Declare fields with a type only (`foo: number;`)
  and assign them in the constructor in the same order as the Lingo. (`useDefineForClassFields` is off.)
- **Do not redeclare a field an ancestor already declares** (check the base class file). If a Lingo child
  `property` list repeats an ancestor's property, it is the same field.
- `me.x` and bare property names → `this.x`. A bare local handler call `foo(a)` inside a script (no object)
  → `this.foo(a)` (Lingo resolves it in the same script and the property variables stay in scope).
- `ancestor.foo(a)` → `super.foo(a)`. `destroy` returns `undefined`.
- **Lingo `me` in ancestor handlers**: when a child calls `ancestor.foo()` explicitly, `me` inside the
  ancestor's foo is the ANCESTOR, so `me.bar()` there does NOT reach the child's override of bar.
  If a class is extended by other classes (it is an ancestor somewhere), then in each method that calls
  other overridable methods on `me`, start with `const me = lingoMe(this, ThisClass, 'methodName');` and call
  `me.bar()`. Leaf classes (nothing extends them) don't need this. See `src/runtime/ancestor.ts`.

## Values
- Linear lists are 1-based `LList`: `[a, b]` → `list(a, b)`, `[]` → `new LList()`, `l[i]` → `l.get(i)`,
  `l[i] = v` → `l.set(i, v)`, `l.count`, `append`, `deleteAt(i)`, `getPos(v)`, `getLast()`. Keep all indices
  1-based exactly as in the Lingo (animation `order` lists hold 1-based indices).
  `repeat with o in l` → `for (const o of l)`; `repeat with i = a to b` → `for (let i = a; i <= b; i++)`;
  `repeat with i = b down to a` → descending loop; `exit repeat` → `break`; `next repeat` → `continue`; `exit` → `return`.
- Property lists `[:]`, `[#a: 1]` → plain objects `{ a: 1 }`; `getaProp(#a)` / `pl.a` → `pl.a`. Symbols `#foo` → `'foo'`.
- Points/rects are mutable shared references (as in Lingo): `point(h, v)`, `rect(l, t, r, b)`, `rect(p1, p2)`.
  Points keep floats, but Director rects hold integers only: the runtime `Rect` rounds every coordinate like
  `integer()` (so `defRect.offset(floatX, floatY)` and `rect(floatPoint, floatPoint)` are integer rects).
  `a + b` → `a.add(b)`, `a - b` → `a.sub(b)`, `p * n` → `p.mul(n)`, `p / n` → `p.div(n)` (float; use
  `p.idiv(n)` if the Lingo point and divisor are integers). `rectA - rect(p, p)` → `rectA.sub(rect(p, p))`.
  `r.intersect(x) <> g.RECT_0` → `!r.intersect(x).isZero()`. `p.inside(r)`, `.offset(h, v)`, `.inflate(h, v)`,
  `.duplicate()`, `.locH/.locV`, `.left/.top/.right/.bottom/.width/.height`. Point equality `a = b` → `a.equals(b)`.
- **Integer division**: Lingo `/` truncates when BOTH operands are integers. Use `idiv(a, b)` there. Floats
  (`1.0`, `float(x)`, positions/velocities — `setPos`/`setVel` store floats) use `/`. Decide per expression
  from the types in the Lingo; when unsure, check `.lasm` and the variable's origin.
- `integer(x)` (rounds halves away from zero), `float(x)`, `abs`, `x mod y` → `x % y`, `random(n)` (1..n),
  `bitAnd/bitOr/bitXor/bitNot`, `voidp`, `objectp`, `integerp`, `VOID` → `undefined`, `EMPTY` → `''`.
- Lingo booleans are 1/0. Comparisons in TS give booleans, which is fine in conditions. Where a boolean is
  stored and later used in arithmetic or compared with `=` to a number, convert with `b2i()`. `=` → `===`,
  `<>` → `!==`, `and/or/not` → `&&/||/!`. Strings: `&` → `+`, `&&` → `+ ' ' +`, `contains` → `.includes`
  (case-insensitive in Lingo: compare lower-cased).
- `case x of a: ... b, c: ... otherwise: ...` → `switch (x) { case a: ...; break; case b: case c: ...; break; default: ... }`.

## Director API (from `'../runtime'`)
- `sprite(n)` (sprite(0) ignores writes), properties `member, loc, locH, locV, locZ, ink, blend, visible,
  flipH, flipV, width, height, rect, puppet, spriteNum`. `visible/flipH/flipV` are booleans: `= 1` → `= true`.
- `member(nameOrNum, cast?)`, member props `number, name, rect, regPoint (mutable Point), width, height,
  image, text, type`; `image.duplicate()`, `image.copyPixels(src, destRect, srcRect)`, `member.erase()`.
- `the frame` → `theFrame()`, `go(x)`, `label("x")`, `marker(n)`, `the milliSeconds` → `theMilliseconds()`,
  `the ticks` → `theTicks()`, `keyPressed(code)`, `cursor(n)`, `sound(n)`, `(the stage).rect` → `stageRect()`,
  `the runMode` → `runMode` (always "Projector"). `obj.handler(#name)` → `typeof obj.name === 'function'`.
  `ilk(x) = #point` → `x instanceof Point`. `put`/debug output → omit.
- Score behaviours (`BehaviorScript`) extend `Behavior`; handlers `beginSprite, endSprite, prepareFrame,
  enterFrame, exitFrame, mouseDown, mouseUp, mouseEnter, mouseLeave, mouseWithin`. Properties from
  `getPropertyDescriptionList` become declared fields (the score player sets them before `beginSprite`);
  drop `getPropertyDescriptionList` itself. `pass()` → `return PASS`. `me.spriteNum` → `this.spriteNum`.
  `tell sprite(n) to go(f)` → `sprite(n).tellGo(f)` (jumps the film loop's own score).

## Globals and assets
- `global g` → `import { g } from '../runtime'`. `g.classes.Class_X`, `g.assets.ROBIN.ROBIN_STAND_01`,
  `g.main`, `g.game`, `g.screen`, constants `g.MOVE_*`, `g.DAMAGE_*`, `g.SPRITE_LOCZ_*` …
- TypeScript is case-sensitive, Lingo is not. Asset field names are in `src/game/Class_Assets*.ts`
  (generated; spelling matches the Lingo name table, so use the spelling in the source).
- Typing: keep it loose and fast — `any` for object references (`owner`, `target`, `opponent`, screen
  objects); explicit types for numbers/points/lists where obvious.

## Checking
- `npm run typecheck` (or `npx tsc --noEmit`) from the repository root.
- Behaviour is checked against the original with the verification scenarios ([VERIFICATION.md](VERIFICATION.md)):
  a correct port produces pixel-identical captures and identical sprite state on every tick.
- Things to double-check in review: integer vs float division, ancestor dispatch (`lingoMe`), redeclared
  properties.
