import { g, Point, list } from '../../runtime';
import { Class_Effect } from '../actors/Class_Effect';

export class Class_DustJumpEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, -initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_DUST_JUMP_01, g.assets.CHAR_SHARED.FX_DUST_JUMP_02, g.assets.CHAR_SHARED.FX_DUST_JUMP_03, g.assets.CHAR_SHARED.FX_DUST_JUMP_04, g.assets.CHAR_SHARED.FX_DUST_JUMP_05, g.assets.CHAR_SHARED.FX_DUST_JUMP_06, g.assets.CHAR_SHARED.FX_DUST_JUMP_07, g.assets.CHAR_SHARED.FX_DUST_JUMP_08, g.assets.CHAR_SHARED.FX_DUST_JUMP_09, g.assets.CHAR_SHARED.FX_DUST_JUMP_10);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
