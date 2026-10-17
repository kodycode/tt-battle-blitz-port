import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_RavenSwirlEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.visSprite.locZ = g.SPRITE_LOCZ_EFFECTS_BACKGROUND;
    const S = g.assets.CHAR_SHARED;
    const vis = list(
      S.FX_RAVEN_SWIRL_01,
      S.FX_RAVEN_SWIRL_02,
      S.FX_RAVEN_SWIRL_03,
      S.FX_RAVEN_SWIRL_04,
      S.FX_RAVEN_SWIRL_05,
      S.FX_RAVEN_SWIRL_06,
      S.FX_RAVEN_SWIRL_07,
      S.FX_RAVEN_SWIRL_08,
      S.FX_RAVEN_SWIRL_09,
      S.FX_RAVEN_SWIRL_10,
      S.FX_RAVEN_SWIRL_11,
      S.FX_RAVEN_SWIRL_12,
      S.FX_RAVEN_SWIRL_13,
      S.FX_RAVEN_SWIRL_14,
      S.FX_RAVEN_SWIRL_15,
      S.FX_RAVEN_SWIRL_16,
      S.FX_RAVEN_SWIRL_17,
      S.FX_RAVEN_SWIRL_18,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
