import { g, sprite, member, Behavior } from '../../../runtime';

export class Behavior_SelectScreenChangeEnemyFace extends Behavior {
  beginSprite(): void {
    sprite(this.spriteNum).member = member('bg_head_' + g.main.screen.fighterNames.get(g.enemyID), 'select_screen');
  }
}
