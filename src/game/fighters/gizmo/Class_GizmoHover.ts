import { g, list, random } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_GizmoHover extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_HOVER_01);
    const att = list(g.MEMBER_0);
    const def = list(A.GIZMO_HOVER_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(_arg?: any): void {
    super.reset();
    this.owner.setVel(0.0, 0.0);
    this.owner.setPosY(this.owner.HOVER_HEIGHT);
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(1);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    this.owner.setHovering(0);
  }

  update(): void {
    super.update();
    if (this.age % 20 === 1) {
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_FLY, 100, g.SFX_EVENT_PRIORITY_LOW);
      else g.main.audioMgr.playSound(g.assets.GIZMO.sfx_gizmo_fly2, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
  }
}
