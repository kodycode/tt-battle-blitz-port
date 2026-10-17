import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_GizmoCannon extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.attackDamage = g.DAMAGE_GIZMO_CANNON;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_MACHINEGUN_01, A.GIZMO_MACHINEGUN_02, A.GIZMO_MACHINEGUN_03, A.GIZMO_MACHINEGUN_04, A.GIZMO_MACHINEGUN_05, A.GIZMO_MACHINEGUN_06, A.GIZMO_MACHINEGUN_07, A.GIZMO_MACHINEGUN_08);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D, A.GIZMO_STAND_01D);
    const order = list(1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.STATE_FINISH = 3;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Lingo `on advanceState` (no `me`, called locally).
  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_BACKPACKCANNONEMERGING, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.age > 1) this.animation.advance();
        if (this.animation.orderIndex === 8) this.advanceState();
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.owner.setShaking(1);
          this.projectile = new g.classes.Class_GizmoCannonProjectile(this.owner, this.owner.pos.add(point(28 * this.owner.dir, -75)), point(0, 0), this.owner.dir);
          g.main.screen.addProjectile(this.projectile);
        }
        if (!this.projectile.isAlive()) {
          this.projectile = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.owner.setShaking(0);
          g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_BACKPACKCANNONEMERGING3, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.animation.advance();
        if (this.animation.isDone()) this.moveDone = 1;
        break;
    }
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.projectile = undefined;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    super.stop();
    this.owner.setShaking(0);
    if (!voidp(this.projectile)) {
      g.game.killProjectile(this.projectile);
      this.projectile = undefined;
    }
  }
}
