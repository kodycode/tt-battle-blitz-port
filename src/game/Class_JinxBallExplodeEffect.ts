import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_JinxBallExplodeEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.JINX;
    const vis = list(
      A.FX_JINX_ENERGYBALL_14, A.FX_JINX_ENERGYBALL_15, A.FX_JINX_ENERGYBALL_16, A.FX_JINX_ENERGYBALL_17,
      A.FX_JINX_ENERGYBALL_18, A.FX_JINX_ENERGYBALL_19, A.FX_JINX_ENERGYBALL_20, A.FX_JINX_ENERGYBALL_21,
      A.FX_JINX_ENERGYBALL_22, A.FX_JINX_ENERGYBALL_23, A.FX_JINX_ENERGYBALL_24, A.FX_JINX_ENERGYBALL_25,
      A.FX_JINX_ENERGYBALL_26, A.FX_JINX_ENERGYBALL_27, A.FX_JINX_ENERGYBALL_28, A.FX_JINX_ENERGYBALL_29,
      A.FX_JINX_ENERGYBALL_30, A.FX_JINX_ENERGYBALL_31, A.FX_JINX_ENERGYBALL_32, A.FX_JINX_ENERGYBALL_33,
      A.FX_JINX_ENERGYBALL_34, A.FX_JINX_ENERGYBALL_35,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(2);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
