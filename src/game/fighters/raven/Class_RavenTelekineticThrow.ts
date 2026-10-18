import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_RavenTelekineticThrow extends Class_Move {
  STATE_LAUNCH: number;
  STATE_SUMMON: number;
  STATE_THROW: number;
  STATE_FALL: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    // ORIGINAL BUG: uses Robin's disc-throw damage constant (harmless: the projectile deals the damage).
    this.attackDamage = g.DAMAGE_ROBIN_DISC_THROW;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.RAVEN;
    const vis = list(A.RAVEN_THROW_01, A.RAVEN_THROW_02, A.RAVEN_DUCK_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.RAVEN_THROW_01D, A.RAVEN_THROW_02D, A.RAVEN_DUCK_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_SUMMON = 2;
    this.STATE_THROW = 3;
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
      g.game.killProjectile(this.projectile);
      this.projectile = undefined;
    }
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
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
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.RAVEN.SFX_RAVEN_FLOATUP, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.delayFrames === 2) this.owner.moveBy(0.0, -30.0);
        else if (this.delayFrames === 1) this.owner.moveBy(0.0, -40.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_SUMMON:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 6;
          g.game.addEffect(new g.classes.Class_RavenSwirlEffect(this.owner, this.owner.pos.add(point(0.0, -110.0)), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_VORTEX, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.projectile = new g.classes.Class_RavenTelekineticThrowProjectile(this.owner, this.owner.pos.add(point(-100.0 * this.owner.dir, 0.0)), point(0, 0), this.owner.dir);
          g.game.addProjectile(this.projectile);
          this.projectile.setArmed(0);
          this.projectile.getSprite().blend = 0;
        }
        if (this.delayFrames > 1) this.projectile.moveBy(20.0 * this.owner.dir, 0.0);
        this.projectile.getSprite().blend = this.projectile.getSprite().blend + 20;
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_THROW:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 10;
          this.projectile.getSprite().blend = 100;
          this.projectile.setVelX(25.0 * this.owner.dir);
          this.projectile.setArmed(1);
          this.projectile = undefined;
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_FLINGOBJECT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_FALL:
        if (this.initState) {
          this.initState = 0;
          this.projectile = undefined;
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
          this.delayFrames = 4;
          this.owner.setOnGround(1);
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
