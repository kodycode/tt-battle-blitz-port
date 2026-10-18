import { g, sprite, Behavior } from '../../../runtime';

export class Behavior_ChangeRoundNumMember extends Behavior {
  beginSprite(): void {
    switch (g.game.roundNum) {
      case 1:
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_ROUND_NUM1;
        break;
      case 2:
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_ROUND_NUM2;
        break;
      case 3:
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_ROUND_NUM3;
        break;
    }
  }

  endSprite(): void {}
}
