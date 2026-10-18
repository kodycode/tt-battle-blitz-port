import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_GizmoCannonBlastEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const A = g.assets.GIZMO;
    const vis = list(A.FX_GIZMO_CANNON_BLAST_01, A.FX_GIZMO_CANNON_BLAST_02, A.FX_GIZMO_CANNON_BLAST_03, A.FX_GIZMO_CANNON_BLAST_04);
    const order = list(1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
