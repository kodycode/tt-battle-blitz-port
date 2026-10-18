import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_CinderblockEnergyEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CINDERBLOCK;
    const vis = list(
      A.FX_CINDERBLOCK_ENERGY_01,
      A.FX_CINDERBLOCK_ENERGY_02,
      A.FX_CINDERBLOCK_ENERGY_03,
      A.FX_CINDERBLOCK_ENERGY_04,
      A.FX_CINDERBLOCK_ENERGY_05,
      A.FX_CINDERBLOCK_ENERGY_06,
      A.FX_CINDERBLOCK_ENERGY_07,
      A.FX_CINDERBLOCK_ENERGY_08,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(2);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
