import { g, sprite, Behavior } from '../runtime';

export class Behavior_ChangeWinBGLoop extends Behavior {
  beginSprite(): void {
    if (g.game.playerWins > g.game.enemyWins) {
      if (g.playMode === g.PLAYMODE_AS_TITANS) {
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.LOOP_TITAN_WINS;
      } else {
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.LOOP_VILLAIN_WINS;
      }
    } else {
      if (g.playMode === g.PLAYMODE_AS_TITANS) {
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.LOOP_VILLAIN_WINS;
      } else {
        sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.LOOP_TITAN_WINS;
      }
    }
  }
}
