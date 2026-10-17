import { open, clickMap, runMap, FIGHT_MENU, save } from './drv.mjs';
import { makeBot } from './bot.mjs';
const name = process.argv[2], nMatch = Number(process.argv[3]), idleAfter = Number(process.argv[4] || 120);
const params = [{range:80,gap:4},{range:60,gap:6},{range:80,gap:4},{range:70,gap:5},{range:80,gap:4}];
const api = await open();
const gi = () => api.eval(() => { const g = window.__tt.g; return { enemy: g.enemyID, unl: [...g.unlockedEnemies.get(g.playerID).entries ? g.unlockedEnemies.get(g.playerID).entries() : []], }; }).catch(e=>String(e));
await runMap(api, clickMap(FIGHT_MENU()), 612);
for (let m = 0; m < nMatch; m++) {
  const en = await api.eval(() => window.__tt.g.enemyID);
  const b = makeBot(api, params[m]);
  const t0 = api.tick;
  while (api.state.screen === 6 && api.tick < 20000) await api.step(b.aggressive());
  await api.step(b.release());
  console.log('match', m, 'enemy', en, 'ticks', t0, '->', api.tick, 'screen', api.state.screen, 'nextEnemy', await api.eval(() => window.__tt.g.enemyID));
  if (m < nMatch - 1) { const t = api.tick + 100; await runMap(api, new Map(), t); await runMap(api, clickMap([[api.tick + 1, 302, 129]]), t + 262); }
}
await runMap(api, new Map(), api.tick + idleAfter);
console.log('total ticks', api.tick, 'screen', api.state.screen);
save(name, api, api.tick);
await api.close();
