import { key } from './drv.mjs';
export function makeBot(api, o = {}) {
  const held = new Set(), tapUntil = new Map();
  const O = { range: 90, gap: 6, ...o };
  function set(want) { const ev = []; for (const k of [...held]) if (!want.has(k)) { ev.push(key(k, false)); held.delete(k); } for (const k of want) if (!held.has(k)) { ev.push(key(k, true)); held.add(k); } return ev; }
  return {
    held,
    release: () => set(new Set()),
    // one tick of default aggressive behaviour; returns events
    aggressive() {
      const f = api.state.fight; const want = new Set();
      if (f && api.state.screen === 6) {
        const dx = f.enemy.x - f.player.x, d = Math.abs(dx);
        if (d > O.range) want.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else { const k = (Math.floor(api.tick / O.gap) % 2) ? 'KeyZ' : 'KeyX'; want.add(k); tapUntil.set(k, api.tick + 2); }
        for (const [k, t] of tapUntil) if (api.tick < t) want.add(k);
      }
      return set(want);
    },
    set,
  };
}
