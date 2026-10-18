import { g, Point } from '../../../runtime';
import { Class_JinxFistEffect } from './Class_JinxFistEffect';

export class Class_JinxPunchEffect extends Class_JinxFistEffect {
  wave2effect: any;
  wave3effect: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.wave2effect = new g.classes.Class_JinxFistEffect(owner, initPos, initVel, initDir);
    this.wave3effect = new g.classes.Class_JinxFistEffect(owner, initPos, initVel, initDir);
  }

  // Note: the original never destroys wave2effect/wave3effect here; they release their own sprites
  // when their animations finish.
  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    if (this.age >= 3) this.wave2effect.update();
    if (this.age >= 5) this.wave3effect.update();
  }

  paint(): void {
    super.paint();
    if (this.age >= 3) this.wave2effect.paint();
    if (this.age >= 5) this.wave3effect.paint();
  }

  isAlive(): number {
    return this.wave3effect.isAlive();
  }
}
