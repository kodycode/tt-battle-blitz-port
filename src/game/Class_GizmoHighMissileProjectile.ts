import { g, Point } from '../runtime';
import { Class_GizmoMissileProjectile } from './Class_GizmoMissileProjectile';

export class Class_GizmoHighMissileProjectile extends Class_GizmoMissileProjectile {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_GIZMO_HIGH_AIR_MISSILE;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }
}
