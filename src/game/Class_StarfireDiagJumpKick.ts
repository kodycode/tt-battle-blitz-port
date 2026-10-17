import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_StarfireDiagJumpKick extends Class_Move {
  STATE_LAUNCH: number;
  STATE_ATTACK: number;
  STATE_HIT: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_STARFIRE_DIAG_JUMP_KICK;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.STARFIRE;
    const vis = list(A.STARFIRE_FLYINGKICK_01, A.STARFIRE_FLYINGKICK_02, A.STARFIRE_FALL_01, A.STARFIRE_FALL_02);
    const att = list(g.MEMBER_0, A.STARFIRE_FLYINGKICK_02A, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.STARFIRE_FLYINGKICK_01D, A.STARFIRE_FLYINGKICK_02D, A.STARFIRE_FALL_01D, A.STARFIRE_FALL_02D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_ATTACK = 2;
    this.STATE_HIT = 3;
    this.STATE_DESCENT = 4;
    this.STATE_LAND = 5;
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
    this.owner.setOnGround(0);
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
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVel(26.0 * this.owner.dir, 26.0);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_ROBIN_FLYING_KICK_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.owner.setShowingTrails(1);
        }
        if (this.hitOpponent) {
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        } else if (this.owner.getPosY() + this.owner.getVelY() >= 0.0) {
          this.owner.setPosY(30.0);
          this.owner.setVel(0.0, 0.0);
          this.animation.advance();
          this.setState(this.STATE_LAND);
        }
        break;
      case this.STATE_HIT:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 5;
          this.owner.setShowingTrails(0);
          if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(74.0 * this.owner.dir, -52.0)), point(0, 0), this.owner.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.owner.setVel(-5.0 * this.owner.dir, -10.0);
          this.animation.advance();
          this.initState = 0;
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.getPosY() + this.owner.getVelY() >= 0.0) {
          this.owner.setPosY(0.0);
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          if (!this.hitOpponent) this.animation.advance();
          this.owner.setPosY(0.0);
          this.delayFrames = 6;
          this.owner.setOnGround(1);
          this.owner.setHovering(1);
          this.owner.setShowingTrails(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
