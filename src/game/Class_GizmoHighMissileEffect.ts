import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_GizmoHighMissileEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_MISSILE01_00, A.GIZMO_MISSILE01_01, A.GIZMO_MISSILE01_02, A.GIZMO_MISSILE01_03, A.GIZMO_MISSILE01_04, A.GIZMO_MISSILE01_05, A.GIZMO_MISSILE01_06, A.GIZMO_MISSILE01_07, A.GIZMO_MISSILE01_08, A.GIZMO_MISSILE01_09, A.GIZMO_MISSILE01_10, A.GIZMO_MISSILE01_11, A.GIZMO_MISSILE01_12, A.GIZMO_MISSILE01_13, A.GIZMO_MISSILE01_14, A.GIZMO_MISSILE01_15, A.GIZMO_MISSILE01_16, A.GIZMO_MISSILE01_17, A.GIZMO_MISSILE01_18, A.GIZMO_MISSILE01_19, A.GIZMO_MISSILE01_20, A.GIZMO_MISSILE01_21, A.GIZMO_MISSILE01_22);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
