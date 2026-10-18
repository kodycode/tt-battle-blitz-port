import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_StarfireExplodeEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.blend = 100;
    const A = g.assets.CHAR_SHARED;
    const vis = list(
      A.FX_STARFIRE_EXPLODE_01, A.FX_STARFIRE_EXPLODE_02, A.FX_STARFIRE_EXPLODE_03, A.FX_STARFIRE_EXPLODE_04,
      A.FX_STARFIRE_EXPLODE_05, A.FX_STARFIRE_EXPLODE_06, A.FX_STARFIRE_EXPLODE_07, A.FX_STARFIRE_EXPLODE_08,
      A.FX_STARFIRE_EXPLODE_09, A.FX_STARFIRE_EXPLODE_10, A.FX_STARFIRE_EXPLODE_11, A.FX_STARFIRE_EXPLODE_12,
      A.FX_STARFIRE_EXPLODE_13, A.FX_STARFIRE_EXPLODE_14, A.FX_STARFIRE_EXPLODE_15, A.FX_STARFIRE_EXPLODE_16,
      A.FX_STARFIRE_EXPLODE_17, A.FX_STARFIRE_EXPLODE_18, A.FX_STARFIRE_EXPLODE_19, A.FX_STARFIRE_EXPLODE_20,
      A.FX_STARFIRE_EXPLODE_21, A.FX_STARFIRE_EXPLODE_22,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
