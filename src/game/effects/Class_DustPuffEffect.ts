import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_DustPuffEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, -initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_PUFF_01, g.assets.CHAR_SHARED.FX_PUFF_02, g.assets.CHAR_SHARED.FX_PUFF_03, g.assets.CHAR_SHARED.FX_PUFF_04, g.assets.CHAR_SHARED.FX_PUFF_05, g.assets.CHAR_SHARED.FX_PUFF_06);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
