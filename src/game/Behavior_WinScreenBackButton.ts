import { g, sprite, member, cursor, go, Behavior } from '../runtime';

export class Behavior_WinScreenBackButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('back_button_over', 'win_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('back_button', 'win_screen');
    cursor(-1);
  }

  mouseUp(): void {
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    go('SCREEN_SELECTFIGHTER');
  }
}
