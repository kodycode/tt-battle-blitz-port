import { g, list, Point } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_JinxEnergySpinEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.JINX;
    const vis = list(
      A.FX_JINX_TWIRL_06, A.FX_JINX_TWIRL_07, A.FX_JINX_TWIRL_08, A.FX_JINX_TWIRL_09, A.FX_JINX_TWIRL_10,
      A.FX_JINX_TWIRL_11, A.FX_JINX_TWIRL_12, A.FX_JINX_TWIRL_13, A.FX_JINX_TWIRL_14, A.FX_JINX_TWIRL_15,
      A.FX_JINX_TWIRL_16, A.FX_JINX_TWIRL_17, A.FX_JINX_TWIRL_18, A.FX_JINX_TWIRL_19,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
