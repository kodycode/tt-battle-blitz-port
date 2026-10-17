import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_RavenExplodeEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.blend = 100;
    const A = g.assets.RAVEN;
    const vis = list(
      A.FX_RAVEN_BOOM_01,
      A.FX_RAVEN_BOOM_02,
      A.FX_RAVEN_BOOM_03,
      A.FX_RAVEN_BOOM_04,
      A.FX_RAVEN_BOOM_05,
      A.FX_RAVEN_BOOM_06,
      A.FX_RAVEN_BOOM_07,
      A.FX_RAVEN_BOOM_08,
      A.FX_RAVEN_BOOM_09,
      A.FX_RAVEN_BOOM_10,
      A.FX_RAVEN_BOOM_11,
      A.FX_RAVEN_BOOM_12,
    );
    // FX_RAVEN_BOOM_12 is never shown (order stops at 11), as in the Lingo.
    const order = list(1, 2, 3, 4, 4, 5, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
