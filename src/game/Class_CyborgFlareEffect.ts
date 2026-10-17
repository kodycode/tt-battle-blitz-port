import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_CyborgFlareEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CYBORG;
    const vis = list(A.FX_CYBORG_FLARE_01, A.FX_CYBORG_FLARE_02);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(3);
  }
}
