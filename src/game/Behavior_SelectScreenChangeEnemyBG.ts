import { g, sprite, member, Behavior } from '../runtime';

export class Behavior_SelectScreenChangeEnemyBG extends Behavior {
  beginSprite(): void {
    sprite(this.spriteNum).visible = false;
    sprite(11).visible = true;
    sprite(18).visible = true;
    sprite(18).member = member('loop_figure_' + g.main.screen.fighterNames.get(g.enemyID), 'select_screen');
  }

  endSprite(): void {
    sprite(this.spriteNum).visible = true;
  }
}
