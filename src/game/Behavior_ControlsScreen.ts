import { g, objectp, Behavior } from '../runtime';

export class Behavior_ControlsScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_CONTROLS);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
