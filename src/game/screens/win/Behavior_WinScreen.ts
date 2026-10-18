import { g, objectp, Behavior } from '../../../runtime';

export class Behavior_WinScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_WIN);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
