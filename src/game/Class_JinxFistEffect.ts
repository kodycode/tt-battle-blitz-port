import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

// Ancestor of Class_JinxPunchEffect. Its handlers make no overridable calls on `me`, so no lingoMe needed.
export class Class_JinxFistEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.JINX;
    const vis = list(
      A.JINX_NEWFIST_01, A.JINX_NEWFIST_02, A.JINX_NEWFIST_03, A.JINX_NEWFIST_04, A.JINX_NEWFIST_05,
      A.JINX_NEWFIST_06, A.JINX_NEWFIST_07, A.JINX_NEWFIST_08, A.JINX_NEWFIST_09, A.JINX_NEWFIST_10,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
