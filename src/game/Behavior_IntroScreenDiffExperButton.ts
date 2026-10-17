import { g, sprite, member, cursor, Behavior } from '../runtime';

export class Behavior_IntroScreenDiffExperButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('loop_intro_button_exper', 'title_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('intro_diff_button_border_exper', 'title_screen');
    cursor(-1);
  }

  mouseUp(): void {
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    g.difficulty = g.DIFFICULTY_EXPERT;
    g.main.screen.advanceStage();
  }
}
