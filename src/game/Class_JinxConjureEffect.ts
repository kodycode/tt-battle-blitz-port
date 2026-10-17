import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_JinxConjureEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.JINX;
    const vis = list(
      A.FX_JINX_ENERGYBALL_01, A.FX_JINX_ENERGYBALL_02, A.FX_JINX_ENERGYBALL_03, A.FX_JINX_ENERGYBALL_04,
      A.FX_JINX_ENERGYBALL_05, A.FX_JINX_ENERGYBALL_06, A.FX_JINX_ENERGYBALL_07, A.FX_JINX_ENERGYBALL_08,
      A.FX_JINX_ENERGYBALL_09, A.FX_JINX_ENERGYBALL_10, A.FX_JINX_ENERGYBALL_11,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
