import { g, list, point, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RavenMidairAttack extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FALL: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
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
    const vis = list(S.RAVEN_SPECIAL_03, S.RAVEN_SPECIAL_07, A.RAVEN_JUMP_02, A.RAVEN_DUCK_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.RAVEN_SPECIAL_03D, A.RAVEN_SPECIAL_07D, A.RAVEN_JUMP_02D, A.RAVEN_DUCK_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.STATE_FALL = 3;
    this.STATE_FINISH = 4;
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  stop(): void {
    super.stop();
    this.owner.setShaking(0);
    if (!voidp(this.projectile)) {
      g.game.removeProjectile(this.projectile);
      this.projectile = this.projectile.destroy();
    }
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.projectile = undefined;
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.owner.setShaking(1);
        }
        if (this.stateAge >= 8) this.advanceState();
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setShaking(0);
          g.game.addEffect(new g.classes.Class_RavenSwirlEffect(this.owner, this.owner.pos.add(point(0.0, -110.0)), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_VORTEX, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.projectile = new g.classes.Class_RavenMidairAttackProjectile(this.owner, this.owner.pos.add(point(0.0, -90.0)), point(0, 0), this.owner.dir);
          g.game.addProjectile(this.projectile);
        }
        if (this.stateAge >= 15) this.advanceState();
        break;
      case this.STATE_FALL:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
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
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge >= 4) this.moveDone = 1;
        break;
    }
  }
}
