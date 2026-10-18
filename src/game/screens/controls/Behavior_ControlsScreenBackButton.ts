import { g, sprite, member, cursor, theFrame, Behavior } from '../../../runtime';

export class Behavior_ControlsScreenBackButton extends Behavior {
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
    g.goFrame = theFrame() + 1;
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
  }
}
