import { go, Behavior } from '../runtime';

export class Frame_CNLink_JumpToIntroScreen extends Behavior {
  exitFrame(): void {
    go('SCREEN_INTRO');
  }
}
