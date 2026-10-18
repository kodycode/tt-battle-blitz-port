import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_GroundExplode1Effect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_01, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_02, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_03, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_04, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_05, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_06, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_07, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_08, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_09, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_10, g.assets.CHAR_SHARED.FX_GROUND_EXPLODE_01_11);
    const order = list(1, 2, 3, 4, 4, 5, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
