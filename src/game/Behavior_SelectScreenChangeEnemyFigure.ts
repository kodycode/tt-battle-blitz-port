import { sprite, Behavior } from '../runtime';

export class Behavior_SelectScreenChangeEnemyFigure extends Behavior {
  beginSprite(): void {
    sprite(this.spriteNum).visible = false;
  }

  endSprite(): void {
    sprite(this.spriteNum).visible = true;
  }
}
