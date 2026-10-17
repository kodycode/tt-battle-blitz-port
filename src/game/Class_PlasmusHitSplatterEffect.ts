import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_PlasmusHitSplatterEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.PLASMUS.PLASMUS_HIT_SPLATTER_01);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(5);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
