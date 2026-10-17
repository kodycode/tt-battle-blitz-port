import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_RavenColumnEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const S = g.assets.CHAR_SHARED;
    const vis = list(S.FX_LIGHT_COLUMN_01, S.FX_LIGHT_COLUMN_02, S.FX_LIGHT_COLUMN_03, S.FX_LIGHT_COLUMN_04, S.FX_LIGHT_COLUMN_05, S.FX_LIGHT_COLUMN_06);
    const order = list(1, 1, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
