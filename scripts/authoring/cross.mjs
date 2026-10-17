import { open, clickMap, runMap, FIGHT_MENU, save, key } from './drv.mjs';
const [name, jd, enemyX] = [process.argv[2], Number(process.argv[3] || 170), process.argv[4] ? Number(process.argv[4]) : null];
const api = await open();
const list = [[30, 300, 381], [130, 300, 383], [230, 124, 355], [290, 108, 302]]; if (enemyX) list.push([320, enemyX, 365]); list.push([350, 302, 129]);
await runMap(api, clickMap(list), 612);
const plan = new Map(); const at = (t, e) => { if (!plan.has(t)) plan.set(t, []); plan.get(t).push(e); };
const rel = (c, dir) => (c === 'F' ? (dir > 0 ? 'ArrowRight' : 'ArrowLeft') : c === 'B' ? (dir > 0 ? 'ArrowLeft' : 'ArrowRight') : c === 'D' ? 'ArrowDown' : c === 'Z' ? 'KeyZ' : c === 'X' ? 'KeyX' : 'ArrowUp');
const combo = (t, s, dir) => [...s].forEach((c, i) => { const k = rel(c, dir); at(t + i * 2, key(k, true)); at(t + i * 2 + 1, key(k, false)); });
let phase = 'approach', until = 0, held = null, crossings = 0, lastDir = 1; const combos = ['DFZ', 'BBF', 'BDFX', 'BFBDZ', 'DDFFZ'], cl = []; let ci = 0;
const log = (...a) => console.log(api.tick, ...a);
for (let i = 0; i < 2300 && api.state.screen === 6; i++) {
  const t = api.tick + 1, f = api.state.fight;
  if (f && f.roundState === 0 && t >= until && f.player.currMove === 1 || (f && f.roundState === 0 && t >= until && phase === 'approach' && f.player.currMove === 2)) {
    const dx = f.enemy.x - f.player.x, d = Math.abs(dx), dir = f.player.dir;
    if (phase === 'approach') {
      if (d > jd) { held = dx > 0 ? 'ArrowRight' : 'ArrowLeft'; at(t, key(held, true)); at(t + 6, key(held, false)); until = t + 7; }
      else { const k = dx > 0 ? 'ArrowRight' : 'ArrowLeft'; at(t, key(k, true)); at(t, key('ArrowUp', true)); at(t + 3, key('ArrowUp', false)); at(t + 40, key(k, false)); until = t + 70; phase = 'landed'; log('jump over, dir', dir, 'dx', dx); }
    } else if (phase === 'landed') {
      log('after jump dir', dir, 'dx', Math.round(dx), 'move', f.player.currMove);
      if ((dx > 0) !== (dir > 0)) log('WARN not facing enemy');
      if (dir !== lastDir) { crossings++; lastDir = dir; }
      phase = 'combos';
    } else if (phase === 'combos') {
      if (ci < combos.length) { combo(t, combos[ci], dir); cl.push([t, combos[ci], dir, Math.round(dx)]); ci++; until = t + combos[ci - 1].length * 2 + 45; }
      else { phase = 'approach'; ci = 0; combos.reverse(); }
    }
  }
  await api.step(plan.get(t) || []); plan.delete(t);
}
console.log(JSON.stringify(cl), 'crossings', crossings, 'end', api.tick, 'screen', api.state.screen, JSON.stringify(api.state.fight));
if (process.argv[5] !== 'dry') { await runMap(api, new Map(), api.tick + 100); save(name, api, api.tick); }
await api.close(); process.exit(0);
