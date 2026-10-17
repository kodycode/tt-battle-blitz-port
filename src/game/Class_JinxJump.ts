import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_JinxJump extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT: number;
  STATE_FLIP_1: number;
  STATE_FLIP_2: number;
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
    const A = g.assets.JINX;
    const vis = list(A.JINX_JUMP_01, A.JINX_JUMP_02, A.JINX_JUMP_03, A.JINX_JUMP_04, A.JINX_JUMP_05, A.JINX_JUMP_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.JINX_JUMP_01D, A.JINX_JUMP_02D, A.JINX_JUMP_03D, A.JINX_JUMP_04D, A.JINX_JUMP_05D, A.JINX_JUMP_06D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 5, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_FLIP_1 = 3;
    this.STATE_FLIP_2 = 4;
    this.STATE_DESCENT = 5;
    this.STATE_LAND = 6;
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
          this.animation.advance();
          this.owner.setVel(g.JUMP_VELOCITY.locH * this.jumpDir, g.JUMP_VELOCITY.locV);
          this.owner.setOnGround(0);
          const dir = this.jumpDir === 0 ? this.owner.dir : this.jumpDir;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos, point(0, 0), dir));
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getVelY() > -15.0) this.advanceState();
        break;
      case this.STATE_FLIP_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_0, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getVelY() > -5.0) this.advanceState();
        break;
      case this.STATE_FLIP_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.setState(this.STATE_LAND);
        } else if (this.owner.getVelY() > 5.0) {
          this.advanceState();
        }
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        this.owner.accelerate(g.gravity);
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
