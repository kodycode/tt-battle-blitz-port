import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_GizmoAirJump extends Class_Move {
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
    const vis = list(A.GIZMO_HOVER_01, A.GIZMO_HOVER_01, A.GIZMO_HOVER_01, A.GIZMO_HOVER_01, A.GIZMO_HOVER_01, A.GIZMO_HOVER_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_HOVER_01D, A.GIZMO_HOVER_01D, A.GIZMO_HOVER_01D, A.GIZMO_HOVER_01D, A.GIZMO_HOVER_01D, A.GIZMO_HOVER_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
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
    this.owner.setVel(0.0, 0.0);
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
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
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_1, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.moveBy(0.0, 15.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVel(g.JUMP_VELOCITY.locH * this.jumpDir, g.JUMP_VELOCITY.locV);
          const dir = this.jumpDir === 0 ? this.owner.dir : this.jumpDir;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), dir));
        }
        this.owner.accelerate(g.gravity.mul(0.75));
        if (this.owner.getVelY() > 0) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        this.owner.accelerate(g.gravity.mul(0.5));
        // Tests against HOVER_HEIGHT + 12 but snaps to y = 12.0, as in the original; STATE_LAND rises back up.
        if (this.owner.getPosY() + this.owner.getVelY() >= this.owner.HOVER_HEIGHT + 12.0) {
          this.owner.setVel(0.0, 0.0);
          this.owner.setPosY(12.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVel(0.0, -10.0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.owner.getPosY() <= this.owner.HOVER_HEIGHT) {
          this.owner.setVel(0.0, 0.0);
          this.owner.setPosY(this.owner.HOVER_HEIGHT);
          this.moveDone = 1;
        }
        break;
    }
  }
}
