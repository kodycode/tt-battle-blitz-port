import { g, list } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_GizmoLand extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_LAND_01, A.GIZMO_LAND_02, A.GIZMO_LAND_03, A.GIZMO_TAKEOFF_02, A.GIZMO_TAKEOFF_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_LAND_01D, A.GIZMO_LAND_02D, A.GIZMO_LAND_03D, A.GIZMO_TAKEOFF_02D, A.GIZMO_TAKEOFF_01D);
    const order = list(1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    if (this.age === 1) {
      g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_WINGSFOLDIN, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 5) {
      this.owner.moveBy(0.0, -this.owner.HOVER_HEIGHT / 2.0);
    } else if (this.age === 6) {
      this.owner.setOnGround(1);
      this.owner.moveBy(0.0, -this.owner.HOVER_HEIGHT / 2.0);
    }
  }

  reset(_arg?: any): void {
    super.reset();
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setFlying(0);
    this.owner.setVel(0.0, 0.0);
  }
}
