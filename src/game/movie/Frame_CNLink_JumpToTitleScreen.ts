import { go, Behavior } from '../../runtime';

export class Frame_CNLink_JumpToTitleScreen extends Behavior {
  exitFrame(): void {
    go('SCREEN_TITLE');
  }
}
