import { key } from './drv.mjs';
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const F = (d) => (d > 0 ? 'ArrowRight' : 'ArrowLeft'), B = (d) => (d > 0 ? 'ArrowLeft' : 'ArrowRight');
// combos relative to facing (fwd/back/down) then attack
const COMBOS = [['D', 'F', 'Z'], ['B', 'B', 'F'], ['B', 'D', 'F', 'X'], ['B', 'F', 'B', 'D', 'Z'], ['D', 'D', 'F', 'F', 'Z']];
export function makeRBot(api, seed, o = {}) {
  const r = rng(seed); const W = { atk: 6, blk: 2, spc: 2, back: 1, jmp: 1, ...o };
  const held = new Set(); const plan = new Map(); let busy = 0;
  const at = (t, ev) => { if (!plan.has(t)) plan.set(t, []); plan.get(t).push(ev); };
  function hold(k, from, dur) { at(from, key(k, true)); at(from + dur, key(k, false)); }
  function pick(ws) { let s = ws.reduce((a, b) => a + b[0], 0) * r(); for (const [w, v] of ws) { s -= w; if (s <= 0) return v; } return ws[ws.length - 1][1]; }
  return {
    step() {
      const t = api.tick + 1; const f = api.state.fight;
      if (!f || api.state.screen !== 6 || f.roundState !== 0) { /* release */
        const ev = [...held].map((k) => key(k, false)); held.clear(); plan.clear(); busy = 0; return ev; }
      if (t >= busy) {
        const dx = f.enemy.x - f.player.x, d = Math.abs(dx), dir = f.player.dir;
        const fw = F(dx), bk = B(dx);
        const rel = (c) => (c === 'F' ? F(dir) : c === 'B' ? B(dir) : c === 'D' ? 'ArrowDown' : c === 'Z' ? 'KeyZ' : 'KeyX');
        const enemyAtk = ![1, 2, 3, 4, 5].includes(f.enemy.currMove) && d < 200;
        if (d > 130) { const dur = 8 + Math.floor(r() * 25); hold(fw, t, dur); busy = t + dur + 1; if (r() < 0.2) { at(t + 2, key('ArrowUp', true)); at(t + 4, key('ArrowUp', false)); } }
        else {
          const act = pick([[W.atk, 'atk'], [W.blk * (enemyAtk ? 4 : 1), 'blk'], [W.spc, 'spc'], [W.back, 'back'], [W.jmp, 'jmp']]);
          if (act === 'atk') { const k = r() < 0.5 ? 'KeyZ' : 'KeyX'; at(t, key(k, true)); at(t + 2, key(k, false)); busy = t + 8 + Math.floor(r() * 6); }
          else if (act === 'blk') { const dur = 10 + Math.floor(r() * 15); hold('ArrowDown', t, dur); busy = t + dur + 1; }
          else if (act === 'spc') { const c = COMBOS[Math.floor(r() * COMBOS.length)]; c.forEach((s, i) => { const k = rel(s); at(t + i * 2, key(k, true)); at(t + i * 2 + 1, key(k, false)); }); busy = t + c.length * 2 + 20; }
          else if (act === 'back') { const dur = 6 + Math.floor(r() * 12); hold(bk, t, dur); busy = t + dur + 1; }
          else { at(t, key('ArrowUp', true)); at(t + 2, key('ArrowUp', false)); if (r() < 0.6) { at(t + 3, key('KeyX', true)); at(t + 8, key('KeyX', false)); } busy = t + 40; }
        }
      }
      const ev = plan.get(t) || []; plan.delete(t);
      // dedupe against held state
      const out = [];
      for (const e of ev) { if (e.down && held.has(e.key)) { out.push(key(e.key, false)); } if (e.down) held.add(e.key); else held.delete(e.key); out.push(e); }
      return out;
    },
  };
}
