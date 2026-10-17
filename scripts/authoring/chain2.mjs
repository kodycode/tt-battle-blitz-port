// usage: node chain2.mjs name '<json list of param objects per match>' idleAfter [dry]
import { open, clickMap, runMap, FIGHT_MENU, save } from './drv.mjs';
import { makeBot } from './bot.mjs';
const name = process.argv[2], params = JSON.parse(process.argv[3]), idleAfter = Number(process.argv[4] || 120), dry = process.argv[5] === 'dry';
const api = await open();
await runMap(api, clickMap(FIGHT_MENU()), 612);
const res = [];
for (let m = 0; m < params.length; m++) {
  const en = await api.eval(() => window.__tt.g.enemyID);
  const b = makeBot(api, params[m]);
  const t0 = api.tick; let lost = 0;
  while (api.state.screen === 6 && api.tick < t0 + 4500) await api.step(b.aggressive());
  await api.step(b.release());
  const f = api.state.fight;
  res.push({ m, en, t0, t1: api.tick, screen: api.state.screen, next: await api.eval(() => window.__tt.g.enemyID) });
  if (api.state.screen === 6) break;
  if (m < params.length - 1) { const t = api.tick + 100; await runMap(api, new Map(), t); await runMap(api, clickMap([[api.tick + 1, 302, 129]]), t + 262); }
}
console.log(JSON.stringify(res));
if (!dry) { await runMap(api, new Map(), api.tick + idleAfter); save(name, api, api.tick); console.log('saved', api.tick); }
await api.close();
