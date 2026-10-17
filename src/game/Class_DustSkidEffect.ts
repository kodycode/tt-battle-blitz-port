import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_DustSkidEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_DUST_SKID_01, g.assets.CHAR_SHARED.FX_DUST_SKID_02, g.assets.CHAR_SHARED.FX_DUST_SKID_03, g.assets.CHAR_SHARED.FX_DUST_SKID_04, g.assets.CHAR_SHARED.FX_DUST_SKID_05, g.assets.CHAR_SHARED.FX_DUST_SKID_06, g.assets.CHAR_SHARED.FX_DUST_SKID_07);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
