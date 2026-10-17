import { g, Point } from '../runtime';
import { Class_DustSkidEffect } from './Class_DustSkidEffect';

// Two skid clouds facing opposite ways: this object plus a private mirrored one (not in the effect group).
export class Class_DustFallEffect extends Class_DustSkidEffect {
  mirrorEffect: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.mirrorEffect = new g.classes.Class_DustSkidEffect(owner, initPos, initVel, -initDir);
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
