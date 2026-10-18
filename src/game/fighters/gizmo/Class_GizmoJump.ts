import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_GizmoJump extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  jumpDir: number;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.GIZMO;
    const vis = list(A.GIZMO_TAKEOFF_01, A.GIZMO_TAKEOFF_02, A.GIZMO_TAKEOFF_03, A.GIZMO_TAKEOFF_04, A.GIZMO_TAKEOFF_05, A.GIZMO_TAKEOFF_06, A.GIZMO_TAKEOFF_07, A.GIZMO_TAKEOFF_08, A.GIZMO_TAKEOFF_09, A.GIZMO_TAKEOFF_10, A.GIZMO_TAKEOFF_11, A.GIZMO_LAND_01, A.GIZMO_LAND_02, A.GIZMO_LAND_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_TAKEOFF_01D, A.GIZMO_TAKEOFF_02D, A.GIZMO_TAKEOFF_03D, A.GIZMO_TAKEOFF_04D, A.GIZMO_TAKEOFF_05D, A.GIZMO_TAKEOFF_06D, A.GIZMO_TAKEOFF_07D, A.GIZMO_TAKEOFF_08D, A.GIZMO_TAKEOFF_09D, A.GIZMO_TAKEOFF_10D, A.GIZMO_TAKEOFF_11D, A.GIZMO_LAND_01D, A.GIZMO_LAND_02D, A.GIZMO_LAND_03D);
    const order = list(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_DESCENT = 3;
    this.STATE_LAND = 4;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.jumpDir = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    if (voidp(arg)) this.jumpDir = 0;
    else if (arg < 0) this.jumpDir = -1;
    else if (arg > 0) this.jumpDir = 1;
    else this.jumpDir = 0;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  // Lingo `on setState i` / `on advanceState` (handlers without `me`, called locally): methods here.
  setState(i: number): void {
    this.initState = 1;
    this.moveState = i;
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_2, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          this.owner.setVel(g.JUMP_VELOCITY.locH * this.jumpDir, g.JUMP_VELOCITY.locV);
          this.owner.setOnGround(0);
          const dir = this.jumpDir === 0 ? this.owner.dir : this.jumpDir;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos, point(0, 0), dir));
        }
        if (this.animation.orderIndex < 11) this.animation.advance();
        this.owner.accelerate(g.gravity.mul(0.75));
        if (this.owner.getVelY() > 0.0) {
          if (this.owner.fallCheck()) this.setState(this.STATE_LAND);
          else if (this.owner.getVelY() > 15.0) this.advanceState();
        }
        break;
      case this.STATE_DESCENT:
        if (this.initState) this.initState = 0;
        if (this.animation.orderIndex < 14) this.animation.advance();
        this.owner.accelerate(g.gravity.mul(0.75));
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 3;
          this.owner.setOnGround(1);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
