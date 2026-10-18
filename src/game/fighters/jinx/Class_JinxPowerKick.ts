import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_JinxPowerKick extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT_1: number;
  STATE_ASCENT_2: number;
  STATE_ATTACK: number;
  STATE_HIT: number;
  STATE_DESCENT_1: number;
  STATE_DESCENT_2: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_JINX_POWER_KICK;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.JINX;
    const vis = list(A.JINX_KICK_01, A.JINX_KICK_02, A.JINX_KICK_03, A.JINX_KICK_04, A.JINX_KICK_05, A.JINX_KICK_06, A.JINX_KICK_07);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, A.JINX_KICK_04A, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.JINX_KICK_01D, A.JINX_KICK_02D, A.JINX_KICK_03D, A.JINX_KICK_04D, A.JINX_KICK_05D, A.JINX_KICK_06D, A.JINX_KICK_07D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT_1 = 2;
    this.STATE_ASCENT_2 = 3;
    this.STATE_ATTACK = 4;
    this.STATE_HIT = 5;
    this.STATE_DESCENT_1 = 6;
    this.STATE_DESCENT_2 = 7;
    this.STATE_LAND = 8;
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
    this.owner.setShowingTrails(0);
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  // Lingo `on advanceState` / `on setState state` (handlers without `me`, called locally): methods here.
  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  setState(state: number): void {
    this.initState = 1;
    this.moveState = state;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 4;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_0, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setOnGround(0);
          this.delayFrames = 2;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, o.pos, point(0, 0), o.dir));
          o.setVel(o.dir * 5.0, -5.0);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setVel(o.dir * 30.0, 0.0);
          o.setShowingTrails(1);
          g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_FLYING_KICK, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.age % 3 === 0) {
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, point(o.getPosX(), 0.0), point(0, 0), o.dir));
        }
        if (this.age > 30) o.accelerate(g.gravity);
        this.delayFrames = this.delayFrames - 1;
        if (this.hitOpponent) {
          o.setVel(0.0, 0.0);
          this.advanceState();
        } else if (o.getPosY() + o.getVelY() >= 30.0) {
          o.setPosY(0.0);
          o.setVel(0.0, 0.0);
          this.setState(this.STATE_LAND);
          this.animation.advance();
          this.animation.advance();
          this.animation.advance();
        }
        break;
      case this.STATE_HIT:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 5;
          o.setVel(0.0, 0.0);
          o.setShowingTrails(0);
          if (o.opponent.isBlocking() || !o.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(o, o.pos.add(point(91.0 * o.dir, -99.0)), point(0, 0), o.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setVel(-10.0 * o.dir, -10.0);
        }
        o.accelerate(g.gravity);
        if (o.getVelY() > 0.0) this.advanceState();
        break;
      case this.STATE_DESCENT_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        o.accelerate(g.gravity);
        if (o.getPosY() + o.getVelY() >= 0.0) {
          o.setPosY(0.0);
          o.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setOnGround(1);
          o.setShowingTrails(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(o, o.pos, point(0, 0), o.dir));
          this.delayFrames = 3;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
