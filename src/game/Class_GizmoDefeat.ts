import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_GizmoDefeat extends Class_Move {
  STATE_LAUNCH: number;
  STATE_FALLING_1: number;
  STATE_FALLING_2: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;
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
    const vis = list(A.GIZMO_HIT_01, A.GIZMO_FALL_01, A.GIZMO_FALL_02);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.GIZMO_HIT_01D, A.GIZMO_FALL_01D, A.GIZMO_FALL_02D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_FALLING_1 = 2;
    this.STATE_FALLING_2 = 3;
    this.STATE_LAND = 4;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.stunDuration = 1;
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
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    this.owner.setFlying(0);
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
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
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = this.stunDuration;
          if (this.delayFrames < 1) this.delayFrames = 1;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_FALLING_1:
        if (this.initState) {
          this.initState = 0;
          // g.KNOCK_OUT_VELOCITY * point(dir, 1): Lingo point * point multiplies element-wise.
          this.owner.setVel(point(g.KNOCK_OUT_VELOCITY.locH * this.owner.dir, g.KNOCK_OUT_VELOCITY.locV * 1));
          this.owner.setOnGround(0);
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getVelY() >= 5.0) this.advanceState();
        break;
      case this.STATE_FALLING_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getPosY() + this.owner.getVelY() >= 0.0 && this.owner.getVelY() > 0) {
          this.owner.setPosY(0.0);
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
          this.owner.setPosY(0.0);
          this.owner.setOnGround(1);
          this.owner.setAlive(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_SLUMP_TO_FLOOR, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.moveDone = 1;
        break;
    }
  }
}
