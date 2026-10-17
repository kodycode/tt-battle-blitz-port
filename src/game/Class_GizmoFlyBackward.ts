import { g, list } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_GizmoFlyBackward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_TAKEOFF_09);
    const att = list(g.MEMBER_0);
    const def = list(A.GIZMO_TAKEOFF_09D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  stop(): void {
    super.stop();
    this.owner.setHovering(0);
  }

  reset(_arg?: any): void {
    super.reset();
    this.owner.setVel(-this.owner.dir * this.owner.WALK_SPEED, 0.0);
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(1);
    this.owner.setShowingTrails(0);
  }

  getFlipX(): number {
    return 1;
  }
}
