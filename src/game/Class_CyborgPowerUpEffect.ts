import { g, list, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_CyborgPowerUpEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.CYBORG;
    const vis = list(
      A.FX_CYBORG_POWERUP_02, A.FX_CYBORG_POWERUP_03, A.FX_CYBORG_POWERUP_04, A.FX_CYBORG_POWERUP_05,
      A.FX_CYBORG_POWERUP_06, A.FX_CYBORG_POWERUP_07, A.FX_CYBORG_POWERUP_08, A.FX_CYBORG_POWERUP_09,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
