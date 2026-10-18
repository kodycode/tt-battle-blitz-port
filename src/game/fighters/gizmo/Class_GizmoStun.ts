import { g, list, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_GizmoStun extends Class_Move {
  // `stunDuration` is in the Lingo property list but Class_Move already declares it: same field.

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(0);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_FALL_01);
    const att = list(g.MEMBER_0);
    const def = list(A.GIZMO_FALL_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.stunDuration = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age >= this.stunDuration) this.moveDone = 1;
  }
}
