import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_StarfireFistEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
    this.visSprite.blend = 100;
    const A = g.assets.STARFIRE;
    const vis = list(
      A.FX_STARFIRE_FIST_01, A.FX_STARFIRE_FIST_02, A.FX_STARFIRE_FIST_03, A.FX_STARFIRE_FIST_04,
      A.FX_STARFIRE_FIST_05, A.FX_STARFIRE_FIST_06, A.FX_STARFIRE_FIST_07, A.FX_STARFIRE_FIST_08,
      A.FX_STARFIRE_FIST_09, A.FX_STARFIRE_FIST_10, A.FX_STARFIRE_FIST_11, A.FX_STARFIRE_FIST_12,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
