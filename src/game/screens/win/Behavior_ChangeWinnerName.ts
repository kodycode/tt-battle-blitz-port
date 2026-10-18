import { g, sprite, Behavior } from '../../../runtime';

export class Behavior_ChangeWinnerName extends Behavior {
  beginSprite(): void {
    switch (g.game.roundState) {
      case g.game.ROUNDSTATE_TITAN_WINS_BY_DAMAGE:
      case g.game.ROUNDSTATE_TITAN_WINS_BY_TIME:
        switch (g.titanID) {
          case g.FIGHTER_ID_ROBIN:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_ROBIN;
            break;
          case g.FIGHTER_ID_RAVEN:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_RAVEN;
            break;
          case g.FIGHTER_ID_CYBORG:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_CYBORG;
            break;
          case g.FIGHTER_ID_STARFIRE:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_STARFIRE;
            break;
          case g.FIGHTER_ID_BEASTBOY:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_BEASTBOY;
            break;
        }
        break;
      case g.game.ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE:
      case g.game.ROUNDSTATE_VILLAIN_WINS_BY_TIME:
        switch (g.villainID) {
          case g.FIGHTER_ID_JINX:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_JINX;
            break;
          case g.FIGHTER_ID_MAMMOTH:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_MAMMOTH;
            break;
          case g.FIGHTER_ID_GIZMO:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_GIZMO;
            break;
          case g.FIGHTER_ID_CINDERBLOCK:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_CINDERBLOCK;
            break;
          case g.FIGHTER_ID_PLASMUS:
            sprite(this.spriteNum).member = g.assets.GAME_MESSAGES.TXT_WIN_PLASMUS;
            break;
        }
        break;
    }
  }
}
