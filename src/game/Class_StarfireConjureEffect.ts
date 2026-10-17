import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_StarfireConjureEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.STARFIRE;
    const vis = list(A.FX_STARFIRE_SUMMON_01, A.FX_STARFIRE_SUMMON_02, A.FX_STARFIRE_SUMMON_03, A.FX_STARFIRE_SUMMON_04, A.FX_STARFIRE_SUMMON_05);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
