import { g, list, Point } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_CyborgRingEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CYBORG;
    const vis = list(A.FX_CYBORG_RING_01, A.FX_CYBORG_RING_02, A.FX_CYBORG_RING_03, A.FX_CYBORG_RING_04, A.FX_CYBORG_RING_05, A.FX_CYBORG_RING_06);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }
}
