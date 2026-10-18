import { go, Behavior } from '../../../runtime';

// win_screen cast: "BehaviorScript 1 - loop_win_animation".
export class loop_win_animation extends Behavior {
  exitFrame(): void {
    go('Win.loop');
  }
}
