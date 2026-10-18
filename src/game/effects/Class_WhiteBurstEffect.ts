import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_WhiteBurstEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_FIST_IN_06, g.assets.CHAR_SHARED.FX_FIST_IN_05, g.assets.CHAR_SHARED.FX_FIST_IN_04, g.assets.CHAR_SHARED.FX_FIST_IN_03, g.assets.CHAR_SHARED.FX_FIST_IN_02, g.assets.CHAR_SHARED.FX_FIST_IN_01);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
