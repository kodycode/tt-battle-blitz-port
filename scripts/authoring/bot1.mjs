import { open, clickMap, runMap, FIGHT_MENU, key, save } from './drv.mjs';
const [range, atk, gap] = process.argv.slice(2).map(Number);
const api = await open();
await runMap(api, clickMap(FIGHT_MENU()), 612);
const held = new Set();
let cool = 0, log = [];
function set(want) { // want: Set of keys held
  const ev = [];
  for (const k of [...held]) if (!want.has(k)) { ev.push(key(k, false)); held.delete(k); }
  for (const k of want) if (!held.has(k)) { ev.push(key(k, true)); held.add(k); }
  return ev;
}
let tapUntil = new Map();
let lastScreen = 6, lastRound = 1;
for (let i = 0; i < 4000; i++) {
  const f = api.state.fight;
  let want = new Set();
  if (f && api.state.screen === 6) {
    const dx = f.enemy.x - f.player.x, d = Math.abs(dx);
    const fwd = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    if (d > range) want.add(fwd);
    else if (api.tick >= cool) {
      // tap attack
      const k = (Math.floor(api.tick / gap) % 2) ? 'KeyZ' : 'KeyX';
      want.add(k); tapUntil.set(k, api.tick + 2);
      if (api.tick % gap == 0) cool = api.tick + 0;
    }
    for (const [k, t] of tapUntil) if (api.tick < t) want.add(k);
  }
  const s = await api.step(set(want));
  if (s.screen !== lastScreen || (s.fight && s.fight.roundNum !== lastRound)) { console.log('tick', s.tick, 'screen', s.screen, 'round', s.fight?.roundNum, 'hp', s.fight?.player.health, s.fight?.enemy.health); lastScreen = s.screen; lastRound = s.fight?.roundNum ?? lastRound; }
  if (i % 200 == 0) console.log(s.tick, JSON.stringify([s.fight?.player.health, s.fight?.enemy.health, s.fight?.clock, s.fight?.player.currMove, s.fight?.enemy.currMove]));
}
await api.close();
