import { open, clickMap, runMap, FIGHT_MENU } from './drv.mjs';
import { makeBot } from './bot.mjs';
for (const [range, gap] of [[90,6],[80,4],[70,8],[100,5],[60,6],[110,3]]) {
  const api = await open();
  await runMap(api, clickMap(FIGHT_MENU()), 612);
  const b = makeBot(api, { range, gap });
  let rounds = [];
  while (api.state.screen === 6 && api.tick < 6000) { const s = api.state; await api.step(b.aggressive()); if (api.state.fight && s.fight && api.state.fight.roundNum !== s.fight.roundNum) rounds.push(api.tick); }
  console.log(range, gap, 'end', api.tick, 'rounds', rounds, 'hp', JSON.stringify(api.state.fight?.player.health));
  await api.close();
}
