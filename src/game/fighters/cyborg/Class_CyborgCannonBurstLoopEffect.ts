import { g, list, Point } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_CyborgCannonBurstLoopEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CYBORG;
    const vis = list(A.FX_CYBORG_CANNON_BURST_06, A.FX_CYBORG_CANNON_BURST_07);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
