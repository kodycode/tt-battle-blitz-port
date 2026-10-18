import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_PlasmusCrabMeltEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.PLASMUS;
    const vis = list(
      A.PLASMUS_CRAB_MELT_01, A.PLASMUS_CRAB_MELT_02, A.PLASMUS_CRAB_MELT_03, A.PLASMUS_CRAB_MELT_04,
      A.PLASMUS_CRAB_MELT_05, A.PLASMUS_CRAB_MELT_06, A.PLASMUS_CRAB_MELT_07, A.PLASMUS_CRAB_MELT_08,
      A.PLASMUS_CRAB_MELT_09, A.PLASMUS_CRAB_MELT_10, A.PLASMUS_CRAB_MELT_11, A.PLASMUS_CRAB_MELT_12,
      A.PLASMUS_CRAB_MELT_13,
    );
    const order = list(1, 1, 1, 2, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
  }
}
