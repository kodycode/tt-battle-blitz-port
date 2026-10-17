import { g, objectp, Behavior } from '../runtime';

export class Behavior_IntroScreen extends Behavior {
  beginSprite(): void {
    g.main.loadScreen(g.SCREEN_INTRO);
  }

  endSprite(): void {
    if (objectp(g)) {
      if (objectp(g.main)) {
        g.main.unloadScreen();
      }
    }
  }
}
