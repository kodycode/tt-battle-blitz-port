import { g, objectp, Behavior } from '../runtime';

export class Behavior_VersusScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_VERSUS);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
