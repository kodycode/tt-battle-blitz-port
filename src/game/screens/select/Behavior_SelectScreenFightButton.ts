import { g, sprite, member, cursor, label, Behavior } from '../../../runtime';

export class Behavior_SelectScreenFightButton extends Behavior {
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
    g.goFrame = label('SCREEN_VERSUS');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_CHARACTERSWITCH3, 100, g.SFX_EVENT_PRIORITY_LOW);
  }
}
