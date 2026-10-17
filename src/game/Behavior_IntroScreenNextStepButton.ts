import { g, sprite, member, cursor, Behavior } from '../runtime';

export class Behavior_IntroScreenNextStepButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('loop_intro_next_button', 'title_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('intro_next_border', 'title_screen');
    cursor(-1);
  }

  mouseUp(): void {
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    g.main.screen.advanceStage();
  }
}
