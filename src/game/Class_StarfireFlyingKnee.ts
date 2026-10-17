import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_StarfireFlyingKnee extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_STARFIRE_FLYING_KNEE;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.STARFIRE;
    const vis = list(A.STARFIRE_FLYINGKNEE_01, A.STARFIRE_FLYINGKNEE_02, A.STARFIRE_FLYINGKNEE_03, A.STARFIRE_FALL_02);
    const att = list(A.STARFIRE_FLYINGKNEE_01A, A.STARFIRE_FLYINGKNEE_02A, A.STARFIRE_FLYINGKNEE_03A, g.MEMBER_0);
    const def = list(A.STARFIRE_FLYINGKNEE_01D, A.STARFIRE_FLYINGKNEE_02D, A.STARFIRE_FLYINGKNEE_03D, A.STARFIRE_FALL_02D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    this.age = this.age + 1;
    const o = this.owner;
    switch (this.age) {
      case 1:
        g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, o.pos, point(0, 0), o.dir));
        o.setShowingTrails(1);
        o.moveBy(26.0 * o.dir, 0.0);
        break;
      case 2:
        o.moveBy(28.0 * o.dir, 0.0);
        break;
      case 3:
        o.moveBy(28.0 * o.dir, 0.0);
        break;
      case 4:
        this.animation.advance();
        o.moveBy(23.0 * o.dir, 0.0);
        break;
      case 5:
        o.moveBy(36.0 * o.dir, -9.0);
        break;
      case 6:
        o.moveBy(35.0 * o.dir, -18.0);
        break;
      case 7:
        this.animation.advance();
        o.moveBy(30.0 * o.dir, -24.0);
        break;
      case 8:
        o.moveBy(24.0 * o.dir, -32.0);
        break;
      case 9:
        o.moveBy(14.0 * o.dir, -31.0);
        break;
      case 10:
        this.animation.advance();
        o.setShowingTrails(0);
        o.moveBy(-5.0 * o.dir, -25.0);
        break;
      case 11:
        o.moveBy(-9.0 * o.dir, -6.0);
        break;
      case 12:
        o.moveBy(-11.0 * o.dir, -4.0);
        break;
      case 13:
        o.moveBy(-11.0 * o.dir, 5.0);
        break;
      case 14:
        o.moveBy(-9.0 * o.dir, 5.0);
        break;
      case 15:
        this.moveDone = 1;
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(77.0 * this.owner.dir, -98.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
