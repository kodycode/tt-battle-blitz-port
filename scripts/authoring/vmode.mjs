// villain mode: node vmode.mjs name villainX range gap idle [dry]
import { open, clickMap, runMap, save } from './drv.mjs';
import { makeBot } from './bot.mjs';
const [name, vx, range, gap, idle] = [process.argv[2], ...process.argv.slice(3, 7).map(Number)], dry = process.argv[7] === 'dry';
const api = await open();
await runMap(api, clickMap([[30, 300, 381], [130, 300, 383], [230, 124, 355], [290, 300, 245], [310, vx, 365], [350, 302, 129]]), 612);
const b = makeBot(api, { range, gap }); const t0 = api.tick;
while (api.state.screen === 6 && api.tick < t0 + 4500) await api.step(b.aggressive());
await api.step(b.release());
const win = await api.eval(() => { const g = window.__tt.g; return !!g.defeatedEnemies.get(g.playerID).get(g.enemyID); });
console.log(JSON.stringify({ vx, range, gap, t0, t1: api.tick, screen: api.state.screen, win, pid: await api.eval(() => window.__tt.g.playerID), en: await api.eval(() => window.__tt.g.enemyID) }));
if (!dry) { await runMap(api, new Map(), api.tick + idle); save(name, api, api.tick); }
await api.close(); process.exit(0);
