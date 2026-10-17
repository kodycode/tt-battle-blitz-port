// cheat-unlocked chain: node chain3.mjs name enemyX(villain portrait x) '<params list>' idle [hero x,y]
import { open, clickMap, runMap, FIGHT_MENU, save, key } from './drv.mjs';
import { makeBot } from './bot.mjs';
const name = process.argv[2], ex = Number(process.argv[3]), params = JSON.parse(process.argv[4]), idle = Number(process.argv[5] || 150), dry = process.argv[6] === 'dry';
const api = await open();
const m = clickMap([[30, 300, 381], [130, 300, 383], [230, 124, 355], [290, Number(process.argv[7] || 108), 302], [395, ex, 365], [430, 302, 129]]);
const cheat = ['KeyO', 'KeyP', 'KeyE', 'KeyN', 'KeyA', 'KeyL', 'KeyL'];
cheat.forEach((k, i) => { const t = 330 + i * 4; m.set(t, [key(k, true)]); m.set(t + 1, [key(k, false)]); });
await runMap(api, m, 430 + 262);
const res = [];
for (let i = 0; i < params.length; i++) {
  const en = await api.eval(() => window.__tt.g.enemyID);
  const b = makeBot(api, params[i]); const t0 = api.tick;
  while (api.state.screen === 6 && api.tick < t0 + 4500) await api.step(b.aggressive());
  await api.step(b.release());
  res.push({ i, en, t0, t1: api.tick, screen: api.state.screen, next: await api.eval(() => window.__tt.g.enemyID), win: await api.eval(() => { const g = window.__tt.g; return !!g.defeatedEnemies.get(g.playerID).get(g.enemyID); }), vict: await api.eval(() => window.__tt.g.victories.get(window.__tt.g.playerID)) });
  if (api.state.screen === 6) break;
  if (i < params.length - 1) { const t = api.tick + 100; await runMap(api, new Map(), t); await runMap(api, clickMap([[api.tick + 1, 302, 129]]), t + 262); }
}
console.log(JSON.stringify(res));
if (!dry) { await runMap(api, new Map(), api.tick + idle); save(name, api, api.tick); console.log('saved', api.tick); }
await api.close();
