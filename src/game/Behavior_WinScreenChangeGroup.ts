import { g, sprite, member, Behavior } from '../runtime';

export class Behavior_WinScreenChangeGroup extends Behavior {
  beginSprite(): void {
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      sprite(this.spriteNum).member = member('tt_ending_titans', 'win_screen');
    } else {
      sprite(this.spriteNum).member = member('tt_ending_villains', 'win_screen');
    }
  }

  endSprite(): void {}
}
