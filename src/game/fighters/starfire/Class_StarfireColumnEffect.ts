import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_StarfireColumnEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
    const A = g.assets.CHAR_SHARED;
    const vis = list(
      A.FX_STARFIRE_COLUMN_01, A.FX_STARFIRE_COLUMN_02,
      A.FX_STARFIRE_COLUMN_FULL_01, A.FX_STARFIRE_COLUMN_FULL_02,
      A.FX_STARFIRE_COLUMN_FULL_01, A.FX_STARFIRE_COLUMN_FULL_02,
      A.FX_STARFIRE_COLUMN_FULL_01, A.FX_STARFIRE_COLUMN_FULL_02,
      A.FX_STARFIRE_COLUMN_FULL_01, A.FX_STARFIRE_COLUMN_FULL_02,
      A.FX_STARFIRE_COLUMN_FULL_01,
      A.FX_STARFIRE_COLUMN_03, A.FX_STARFIRE_COLUMN_05,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
