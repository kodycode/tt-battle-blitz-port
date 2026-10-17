import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_MammothKnockDown extends Class_Move {
  STATE_LAUNCH: number;
  STATE_FALLING: number;
  STATE_LAND: number;
  STATE_STANDUP: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  // `stunDuration` is redeclared in the Lingo property list; it is Class_Move's field here.

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(0);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.MAMMOTH;
    const vis = list(A.MAMMOTH_HIT_01, A.MAMMOTH_FALL_01, A.MAMMOTH_FALL_02, A.MAMMOTH_JUMP_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.MAMMOTH_HIT_01D, A.MAMMOTH_FALL_01D, A.MAMMOTH_FALL_02D, A.MAMMOTH_JUMP_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_FALLING = 2;
    this.STATE_LAND = 3;
    this.STATE_STANDUP = 4;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.stunDuration = 0;
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
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
  }

  // Lingo `on advanceState` (handler without `me`, called locally): method here.
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
      case this.STATE_FALLING:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          // Lingo point * point multiplies component-wise.
          this.owner.setVel(point(g.KNOCK_DOWN_VELOCITY.locH * this.owner.dir, g.KNOCK_DOWN_VELOCITY.locV * 1));
          this.owner.setOnGround(0);
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
          this.delayFrames = 6;
          this.owner.setPosY(0.0);
          this.owner.setOnGround(1);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_SLUMP_TO_FLOOR, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_STANDUP:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 4;
          // ORIGINAL BUG: never cleared again (reset does not call setVulnerable(0)), so every later
          // knock-down is vulnerable from the start.
          this.setVulnerable(1);
          g.main.screen.addEffect(new g.classes.Class_DustSkidEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
