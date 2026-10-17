import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RavenTelekineticSpin extends Class_Move {
  STATE_LAUNCH: number;
  STATE_ASCENT: number;
  STATE_WAIT: number;
  STATE_FALL: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.attackDamage = g.DAMAGE_RAVEN_TELEKINETIC_SPIN;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.RAVEN;
    const S = g.assets.CHAR_SHARED;
    const vis = list(A.RAVEN_SPECIAL_01, A.RAVEN_SPECIAL_02, S.RAVEN_SPECIAL_03, S.RAVEN_SPECIAL_07, A.RAVEN_JUMP_02, A.RAVEN_DUCK_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.RAVEN_SPECIAL_01D, A.RAVEN_SPECIAL_02D, A.RAVEN_SPECIAL_03D, A.RAVEN_SPECIAL_07D, A.RAVEN_JUMP_02D, A.RAVEN_DUCK_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_WAIT = 3;
    this.STATE_FALL = 4;
    this.STATE_FINISH = 5;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  stop(): void {
    super.stop();
    if (!voidp(this.projectile)) {
      g.game.removeProjectile(this.projectile);
      this.projectile = this.projectile.destroy();
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
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          // ORIGINAL BUG: `pos + (40 * pos)` / `pos - (40 * pos)` scale the position (probably meant an offset of 40).
          g.main.screen.addEffect(new g.classes.Class_DustSkidEffect(this.owner, this.owner.pos.add(this.owner.pos.mul(40)), point(0, 0), this.owner.dir));
          g.main.screen.addEffect(new g.classes.Class_DustSkidEffect(this.owner, this.owner.pos.sub(this.owner.pos.mul(40)), point(0, 0), -this.owner.dir));
          this.delayFrames = 6;
          this.owner.setOnGround(0);
          g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_FLOATUP, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.moveBy(0.0, -7.0);
        if (this.delayFrames === 4) {
          this.animation.advance();
        } else if (this.delayFrames === 2) {
          g.game.addEffect(new g.classes.Class_RavenSwirlEffect(this.owner, this.owner.pos.add(point(0.0, -110.0)), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_VORTEX, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.projectile = new g.classes.Class_RavenTelekineticSpinProjectile(this.owner, this.owner.pos.add(point(0.0, -20.0)), point(0, 0), this.owner.dir);
          g.game.addProjectile(this.projectile);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.owner.moveBy(0.0, -7.0);
          this.animation.advance();
          this.delayFrames = 12;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_FALL:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
          g.game.removeProjectile(this.projectile);
          this.projectile = this.projectile.destroy();
          g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_FLOATDOWN, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setOnGround(1);
          this.delayFrames = 4;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
