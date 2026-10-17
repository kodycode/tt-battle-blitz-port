import { g, objectp, Behavior } from '../runtime';

export class Behavior_SelectFighterScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_SELECTFIGHTER);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
