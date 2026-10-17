import { g, objectp, Behavior } from '../runtime';

export class Behavior_GameScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_GAME);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
