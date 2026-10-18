import { g, list } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_GizmoTakeOff extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_TAKEOFF_01, A.GIZMO_TAKEOFF_02, A.GIZMO_TAKEOFF_03, A.GIZMO_TAKEOFF_04, A.GIZMO_TAKEOFF_05, A.GIZMO_TAKEOFF_06, A.GIZMO_TAKEOFF_07, A.GIZMO_TAKEOFF_08, A.GIZMO_TAKEOFF_09, A.GIZMO_TAKEOFF_10, A.GIZMO_TAKEOFF_11);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_TAKEOFF_01D, A.GIZMO_TAKEOFF_02D, A.GIZMO_TAKEOFF_03D, A.GIZMO_TAKEOFF_04D, A.GIZMO_TAKEOFF_05D, A.GIZMO_TAKEOFF_06D, A.GIZMO_TAKEOFF_07D, A.GIZMO_TAKEOFF_08D, A.GIZMO_TAKEOFF_09D, A.GIZMO_TAKEOFF_10D, A.GIZMO_TAKEOFF_11D);
    const order = list(1, 1, 2, 3, 4, 5, 6, 7, 9, 11);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.owner.setFlying(1);
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    super.update();
    if (this.age === 1) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_1, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 4) {
      this.owner.setOnGround(0);
    } else if (this.age === 6) {
      g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_WINGSUNFURL, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
    // HOVER_HEIGHT is the float -40.0, so this is float division (-8.0).
    if (this.age >= 4 && this.age <= 8) this.owner.moveBy(0.0, this.owner.HOVER_HEIGHT / 5);
  }
}
