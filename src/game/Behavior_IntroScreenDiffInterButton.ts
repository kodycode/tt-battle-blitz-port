import { g, sprite, member, cursor, Behavior } from '../runtime';

export class Behavior_IntroScreenDiffInterButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('loop_intro_button_inter', 'title_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('intro_diff_button_border_inter', 'title_screen');
    cursor(-1);
  }

  mouseUp(): void {
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    g.difficulty = g.DIFFICULTY_INTERMEDIATE;
    g.main.screen.advanceStage();
  }
}
