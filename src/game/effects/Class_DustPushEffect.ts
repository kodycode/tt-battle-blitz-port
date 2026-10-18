import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_DustPushEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_DUST_PUSH_01, g.assets.CHAR_SHARED.FX_DUST_PUSH_02, g.assets.CHAR_SHARED.FX_DUST_PUSH_03, g.assets.CHAR_SHARED.FX_DUST_PUSH_04, g.assets.CHAR_SHARED.FX_DUST_PUSH_05, g.assets.CHAR_SHARED.FX_DUST_PUSH_06, g.assets.CHAR_SHARED.FX_DUST_PUSH_07, g.assets.CHAR_SHARED.FX_DUST_PUSH_08, g.assets.CHAR_SHARED.FX_DUST_PUSH_09);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
