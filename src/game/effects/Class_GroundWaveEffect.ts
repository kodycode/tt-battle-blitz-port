import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_GroundWaveEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_GROUND_WAVE_01, g.assets.CHAR_SHARED.FX_GROUND_WAVE_02, g.assets.CHAR_SHARED.FX_GROUND_WAVE_03, g.assets.CHAR_SHARED.FX_GROUND_WAVE_04, g.assets.CHAR_SHARED.FX_GROUND_WAVE_05, g.assets.CHAR_SHARED.FX_GROUND_WAVE_06, g.assets.CHAR_SHARED.FX_GROUND_WAVE_07, g.assets.CHAR_SHARED.FX_GROUND_WAVE_08, g.assets.CHAR_SHARED.FX_GROUND_WAVE_09, g.assets.CHAR_SHARED.FX_GROUND_WAVE_10, g.assets.CHAR_SHARED.FX_GROUND_WAVE_11, g.assets.CHAR_SHARED.FX_GROUND_WAVE_12);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.moveBy(0.0, 10.0);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
