import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_HitStarBurstEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_HIT_02_01, g.assets.CHAR_SHARED.FX_HIT_02_02, g.assets.CHAR_SHARED.FX_HIT_02_03);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
