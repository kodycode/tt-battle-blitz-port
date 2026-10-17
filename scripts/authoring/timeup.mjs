import { save } from './drv.mjs';
import { makeBot } from './bot.mjs';
import { open, clickMap, runMap, FIGHT_MENU, key } from './drv.mjs';
const mode = process.argv[2], en = process.argv[3] ? Number(process.argv[3]) : null;
const api = await open();
const list = [[30, 300, 381], [130, 300, 383], [230, 124, 355], [290, 108, 302]]; if (en) list.push([320, en, 365]); list.push([350, 302, 129]);
await runMap(api, clickMap(list), 612);
const held = new Set(); const bot = makeBot(api, {range:90,gap:4});
const set = (want) => { const ev = []; for (const k of [...held]) if (!want.has(k)) { ev.push(key(k, false)); held.delete(k); } for (const k of want) if (!held.has(k)) { ev.push(key(k, true)); held.add(k); } return ev; };
let last = '';
for (let i = 0; i < Number(process.argv[4] || 5400) - 612; i++) {
  const f = api.state.fight; const want = new Set();
  if (f && api.state.screen === 6 && f.roundState === 0) {
    if (mode === 'lead') { const X = Number(process.env.LEAD || 500); if (!global.sw && f.enemy.health > X) { await api.step(bot.aggressive()); continue; } if (!global.sw) { global.sw = 1; await api.step(bot.release()); continue; } want.add('ArrowDown'); }
    else if (mode === 'mix') { if (api.tick < 612 + 330) { await api.step(bot.aggressive()); continue; } if (api.tick === 612 + 330) { await api.step(bot.release()); continue; } want.add('ArrowDown'); }
    else if (mode === 'block') want.add('ArrowDown');
    else if (mode === 'run') { const dx = f.enemy.x - f.player.x; want.add(dx > 0 ? 'ArrowLeft' : 'ArrowRight'); }
  }
  await api.step(set(want));
  const s = api.state, f2 = s.fight; const sig = f2 ? `${f2.roundNum}/${f2.roundState}` : 'x' + s.screen;
  if (sig !== last) { console.log(s.tick, sig, JSON.stringify(f2 && [f2.clock, f2.player.health, f2.enemy.health, Math.round(f2.player.x), Math.round(f2.enemy.x)])); last = sig; }
  if (i % 300 == 0) console.log('..', s.tick, JSON.stringify(f2 && [f2.clock, f2.player.health, f2.enemy.health, Math.round(f2.player.x), Math.round(f2.enemy.x), f2.player.currMove, f2.enemy.currMove]));
}
if (process.argv[5]) save(process.argv[5], api, api.tick);
await api.close(); process.exit(0);
