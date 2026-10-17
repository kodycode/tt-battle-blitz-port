import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_MammothJump extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT: number;
  STATE_APEX: number;
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
    const A = g.assets.MAMMOTH;
    const vis = list(A.MAMMOTH_JUMP_01, A.MAMMOTH_JUMP_02, A.MAMMOTH_JUMP_03, A.MAMMOTH_JUMP_02, A.MAMMOTH_JUMP_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.MAMMOTH_JUMP_01D, A.MAMMOTH_JUMP_02D, A.MAMMOTH_JUMP_03D, A.MAMMOTH_JUMP_02D, A.MAMMOTH_JUMP_01D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 2, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_APEX = 3;
    this.STATE_DESCENT = 4;
    this.STATE_LAND = 5;
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
          this.delayFrames = 3;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_2, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          this.owner.setVel(g.JUMP_VELOCITY.locH * this.jumpDir, g.JUMP_VELOCITY.locV);
          this.animation.advance();
          this.owner.setOnGround(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getVelY() > -10.0) this.advanceState();
        break;
      case this.STATE_APEX:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.setState(this.STATE_LAND);
        } else if (this.owner.getVelY() > 30.0) {
          this.advanceState();
        }
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
          this.delayFrames = 3;
          this.owner.setOnGround(1);
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.sub(point(20, 0)), point(0, 0), 1));
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.add(point(20, 0)), point(0, 0), -1));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_BIG_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
