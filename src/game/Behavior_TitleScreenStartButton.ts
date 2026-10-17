import { g, cursor, label, sprite, Behavior } from '../runtime';

export class Behavior_TitleScreenStartButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).tellGo(1); // tell sprite(me.spriteNum) to go(1): restart the film loop
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    cursor(-1);
  }

  mouseUp(): void {
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    g.goFrame = label('Billboard');
  }
}
