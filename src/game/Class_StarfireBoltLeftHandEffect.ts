import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_StarfireBoltLeftHandEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CHAR_SHARED;
    const vis = list(A.FX_STARFIRE_BOLT_03, A.FX_STARFIRE_BOLT_04, A.FX_STARFIRE_SWEEP_02);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
