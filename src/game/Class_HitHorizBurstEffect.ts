import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_HitHorizBurstEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_HIT_01_01, g.assets.CHAR_SHARED.FX_HIT_01_02, g.assets.CHAR_SHARED.FX_HIT_01_03, g.assets.CHAR_SHARED.FX_HIT_01_04);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
