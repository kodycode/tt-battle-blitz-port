import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_LightColumnEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_01, g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_02, g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_03, g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_04, g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_05, g.assets.CHAR_SHARED.FX_LIGHT_COLUMN_06);
    const order = list(1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 6, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
