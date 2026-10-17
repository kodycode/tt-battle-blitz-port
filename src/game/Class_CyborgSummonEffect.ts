import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_CyborgSummonEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
    const A = g.assets.CHAR_SHARED;
    const vis = list(A.FX_FIST_IN_01, A.FX_FIST_IN_02, A.FX_FIST_IN_03, A.FX_FIST_IN_04, A.FX_FIST_IN_05, A.FX_FIST_IN_06);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
