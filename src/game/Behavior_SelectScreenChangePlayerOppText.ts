import { g, sprite, member, Behavior } from '../runtime';

export class Behavior_SelectScreenChangePlayerOppText extends Behavior {
  beginSprite(): void {
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      sprite(this.spriteNum).member = member('loop_player_opp_text_as_titans');
    } else {
      sprite(this.spriteNum).member = member('loop_player_opp_text_as_villains');
    }
  }
}
