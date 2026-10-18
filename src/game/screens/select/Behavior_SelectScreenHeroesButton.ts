import { g, sprite, member, cursor, point, Behavior } from '../../../runtime';
// TODO(runtime): `the mouseLoc` is not re-exported from '../../../runtime'; read the input module's mouse state directly.
import { mouse } from '../../../runtime/input';

export class Behavior_SelectScreenHeroesButton extends Behavior {
  beginSprite(): void {
    if (point(mouse.x, mouse.y).inside(sprite(this.spriteNum).rect)) {
      cursor(280);
      sprite(this.spriteNum).member = member('loop_play_as_titans_button_over', 'select_screen');
    }
  }

  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('loop_play_as_titans_button_over', 'select_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('select_heroes.off', 'select_screen');
    cursor(-1);
  }

  mouseUp(): void {
    sprite(this.spriteNum).member = member('select_heroes.off', 'select_screen');
    cursor(-1);
    g.main.screen.setPlayMode(g.PLAYMODE_AS_TITANS);
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
  }
}
