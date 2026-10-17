import { g, sprite, member, cursor, label, Behavior } from '../runtime';

// Attached at runtime by Class_ControlsPopUp to the pause pop-up's "menu" button sprite.
export class Behavior_ControlPopupMenuButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('back_over', 'select_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('back_008', 'select_screen');
    cursor(-1);
  }

  mouseUp(): void {
    g.goFrame = label('SCREEN_SELECTFIGHTER');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
  }
}
