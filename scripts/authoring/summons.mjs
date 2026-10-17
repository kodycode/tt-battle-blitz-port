// node summons.mjs name heroX heroId idleAfter [dry] [enemyX=108(jinx)] [seqOrder]
import { open, clickMap, runMap, save, key } from './drv.mjs';
const [name, hx, hid, idle] = [process.argv[2], ...process.argv.slice(3, 6).map(Number)], dry = process.argv[6] === 'dry';
const exo = process.argv[7] ? Number(process.argv[7]) : null;
const order = (process.argv[8] || '1,2,3,4,5').split(',').map(Number);
const C = { 1: 'BDFBZ', 2: 'BFBDZ', 3: 'DDFFZ', 4: 'FDBDZ', 5: 'BFDDZ' };
const api = await open();
const list = [[30, 300, 381], [130, 300, 383], [230, 124, 355], [290, hx, 302]];
if (exo) list.push([320, exo, 365]);
list.push([350, 302, 129]);
await runMap(api, clickMap(list), 612);
const todo = order.filter((i) => i !== hid); const log = [];
let plan = new Map(), nextTry = 625, cur = null, checkAt = 0;
while (api.tick < 4500 && api.state.screen === 6) {
  const t = api.tick + 1, f = api.state.fight;
  if (cur === null && t >= nextTry && todo.length && f && f.roundState === 0 && [1].includes(f.player.currMove)) {
    cur = todo[0]; const dir = f.player.dir;
    [...C[cur]].forEach((c, i) => { const k = c === 'F' ? (dir > 0 ? 'ArrowRight' : 'ArrowLeft') : c === 'B' ? (dir > 0 ? 'ArrowLeft' : 'ArrowRight') : c === 'D' ? 'ArrowDown' : 'KeyZ'; plan.set(t + i * 2, [key(k, true)]); plan.set(t + i * 2 + 1, [key(k, false)]); });
    checkAt = t + 14;
  }
  if (cur !== null && t === checkAt) {
    const used = await api.eval((i) => window.__tt.g.game.playerCanSummon.get(i) === 0, cur);
    log.push({ t, cur, used }); if (used) { todo.shift(); nextTry = t + 120; } else nextTry = t + 30; cur = null;
  }
  await api.step(plan.get(t) || []); plan.delete(t);
  if (!todo.length && t > nextTry + 200) break;
}
console.log(JSON.stringify(log), 'end', api.tick, 'screen', api.state.screen, JSON.stringify(api.state.fight));
if (!dry) { await runMap(api, new Map(), api.tick + idle); save(name, api, api.tick); }
await api.close(); process.exit(0);
