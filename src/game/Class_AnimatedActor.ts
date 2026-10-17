import { Point, objectp, voidp } from '../runtime';
import { Class_Actor } from './Class_Actor';

export class Class_AnimatedActor extends Class_Actor {
  constructor(initPos: Point, initVel: Point, initDir: number) {
    super(initPos, initVel, initDir);
    this.animation = undefined;
  }

  destroy(): undefined {
    if (objectp(this.animation)) this.animation.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    if (!voidp(this.animation)) {
      this.animation.advance();
      if (this.visSprite.spriteNum > 0) this.visSprite.member = this.animation.getMember();
    }
  }
}
