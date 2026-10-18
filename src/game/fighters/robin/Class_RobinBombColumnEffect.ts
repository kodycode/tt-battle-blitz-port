import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_RobinBombColumnEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.ROBIN;
    const vis = list(A.FX_ROBIN_COLUMN_01, A.FX_ROBIN_COLUMN_02, A.FX_ROBIN_COLUMN_03, A.FX_ROBIN_COLUMN_04, A.FX_ROBIN_COLUMN_05, A.FX_ROBIN_COLUMN_06);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
