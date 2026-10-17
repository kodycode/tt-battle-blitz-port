import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_GizmoExplodeEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.GIZMO;
    const vis = list(A.FX_EXPLODE_01, A.FX_EXPLODE_02, A.FX_EXPLODE_03, A.FX_EXPLODE_04, A.FX_EXPLODE_05, A.FX_EXPLODE_06, A.FX_EXPLODE_07, A.FX_EXPLODE_08, A.FX_EXPLODE_09, A.FX_EXPLODE_10, A.FX_EXPLODE_11, A.FX_EXPLODE_12, A.FX_EXPLODE_13);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
