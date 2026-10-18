import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_PlasmusSplatEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.PLASMUS;
    const vis = list(A.FX_PLASMUS_BLOWUP_01, A.FX_PLASMUS_BLOWUP_02, A.FX_PLASMUS_BLOWUP_03, A.FX_PLASMUS_BLOWUP_04, A.FX_PLASMUS_BLOWUP_05, A.FX_PLASMUS_BLOWUP_06);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(2);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
