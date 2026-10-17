import { g, sprite, member, cursor, Behavior } from '../runtime';

// Attached at runtime by Class_ControlsPopUp to the pause pop-up's "fight" (resume) button sprite.
export class Behavior_ControlPopupFightButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('play_over', 'select_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('button_fight_000', 'select_screen');
    cursor(-1);
  }

  mouseUp(): void {
    sprite(this.spriteNum).member = member('button_fight_000', 'select_screen');
    cursor(-1);
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_CHARACTERSWITCH3, 100, g.SFX_EVENT_PRIORITY_LOW);
    g.game.setPause(0);
  }
}
