import { g, Point } from '../runtime';
import { Class_DustJumpEffect } from './Class_DustJumpEffect';

// Two jump clouds 100 px either side of initPos: this object plus a private mirrored one (not in the effect group).
export class Class_DustHugeFallEffect extends Class_DustJumpEffect {
  mirrorEffect: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, -initDir);
    this.mirrorEffect = new g.classes.Class_DustJumpEffect(owner, initPos, initVel, initDir);
    this.moveBy(100.0 * initDir, 0.0);
    this.mirrorEffect.moveBy(-100.0 * initDir, 0.0);
  }

  destroy(): undefined {
    super.destroy();
    this.mirrorEffect.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    this.mirrorEffect.update();
  }

  kill(): void {
    super.kill();
    this.mirrorEffect.kill();
  }

  paint(): void {
    super.paint();
    this.mirrorEffect.paint();
  }
}
