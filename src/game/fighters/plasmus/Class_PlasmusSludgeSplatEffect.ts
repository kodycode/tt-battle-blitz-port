import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_PlasmusSludgeSplatEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.PLASMUS;
    const vis = list(
      A.PLASMUS_SLUDGE_01, A.PLASMUS_SLUDGE_02, A.PLASMUS_SLUDGE_03, A.PLASMUS_SLUDGE_04,
      A.PLASMUS_SLUDGE_05, A.PLASMUS_SLUDGE_06, A.PLASMUS_SLUDGE_07, A.PLASMUS_SLUDGE_08,
      A.PLASMUS_SLUDGE_09, A.PLASMUS_SLUDGE_10, A.PLASMUS_SLUDGE_11, A.PLASMUS_SLUDGE_12,
      A.PLASMUS_SLUDGE_13, A.PLASMUS_SLUDGE_14, A.PLASMUS_SLUDGE_15, A.PLASMUS_SLUDGE_16,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
