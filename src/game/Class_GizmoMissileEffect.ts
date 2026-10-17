import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_GizmoMissileEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_MISSILE02_00, A.GIZMO_MISSILE02_01, A.GIZMO_MISSILE02_02, A.GIZMO_MISSILE02_03, A.GIZMO_MISSILE02_04, A.GIZMO_MISSILE02_05, A.GIZMO_MISSILE02_06, A.GIZMO_MISSILE02_07, A.GIZMO_MISSILE02_08, A.GIZMO_MISSILE02_09, A.GIZMO_MISSILE02_10, A.GIZMO_MISSILE02_11, A.GIZMO_MISSILE02_12, A.GIZMO_MISSILE02_13, A.GIZMO_MISSILE02_14);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
