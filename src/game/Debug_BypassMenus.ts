import { g, go, Behavior } from '../runtime';

export class Debug_BypassMenus extends Behavior {
  exitFrame(): void {
    g.difficulty = 1;
    g.titanID = g.FIGHTER_ID_ROBIN;
    g.villainID = g.FIGHTER_ID_MAMMOTH;
    g.playerID = g.villainID;
    g.enemyID = g.titanID;
    go('SCREEN_GAME');
  }
}
