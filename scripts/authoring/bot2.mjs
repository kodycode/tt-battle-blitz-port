import { open, clickMap, runMap, FIGHT_MENU, key, save } from './drv.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const api = await open();
await runMap(api, clickMap(FIGHT_MENU()), 612);
// fast-forward using bot logic to win screen
const held = new Set(); const tapUntil = new Map();
function set(want) { const ev = []; for (const k of [...held]) if (!want.has(k)) { ev.push(key(k, false)); held.delete(k); } for (const k of want) if (!held.has(k)) { ev.push(key(k, true)); held.add(k); } return ev; }
while (api.state.screen !== 3) {
  const f = api.state.fight; let want = new Set();
  if (f && api.state.screen === 6) { const dx = f.enemy.x - f.player.x, d = Math.abs(dx);
    if (d > 90) want.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); else { const k = (Math.floor(api.tick / 6) % 2) ? 'KeyZ' : 'KeyX'; want.add(k); tapUntil.set(k, api.tick + 2); }
    for (const [k, t] of tapUntil) if (api.tick < t) want.add(k); }
  await api.step(set(want));
}
console.log('win screen at', api.tick);
for (let i=0;i<400;i++){ await api.step(); if (i%50==0){ const png = await api.eval(()=>window.__tt.test.capture().png); fs.writeFileSync(path.join(os.tmpdir(), 'w'+i+'.png'), Buffer.from(png.split(',')[1],'base64')); console.log(i, api.state.screen, api.state.frame);} }
console.log(JSON.stringify(await api.eval(()=>window.__tt.sprites())).slice(0,3000));
await api.close();
