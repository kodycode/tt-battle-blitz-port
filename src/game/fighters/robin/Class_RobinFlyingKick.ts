import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_RobinFlyingKick extends Class_Move {
  STATE_LAUNCH: number;
  STATE_ASCENT: number;
  STATE_ATTACK: number;
  STATE_HIT: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  STATE_STANDUP: number;
  moveState: number;
  initState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_ROBIN_FLYING_KICK;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.ROBIN;
    const S = g.assets.CHAR_SHARED;
    const vis = list(A.ROBIN_JUMP_01, S.ROBIN_FLYINGKICK_01, S.ROBIN_FLYINGKICK_02, S.ROBIN_FLYINGKICK_01, A.ROBIN_SOFTLANDING_01, A.ROBIN_STANDUP_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.ROBIN_FLYINGKICK_02A, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.ROBIN_JUMP_01D, A.ROBIN_FLYINGKICK_01D, A.ROBIN_FLYINGKICK_02D, A.ROBIN_FLYINGKICK_01D, A.ROBIN_SOFTLANDING_01D, A.ROBIN_STANDUP_01D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 5, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_ATTACK = 3;
    this.STATE_HIT = 4;
    this.STATE_DESCENT = 5;
    this.STATE_LAND = 6;
    this.STATE_STANDUP = 7;
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
          this.delayFrames = 2;
          this.animation.advance();
          this.owner.setOnGround(0);
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
        }
        this.owner.moveBy(0.0, -15.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.owner.setVel(30.0 * this.owner.dir, 0.0);
          this.delayFrames = 8;
          this.animation.advance();
          this.owner.setShowingTrails(1);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_ROBIN_FLYING_KICK_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames <= 0) this.owner.accelerate(g.gravity);
        if (this.hitOpponent) {
          this.advanceState();
        } else if (this.owner.getPosY() + this.owner.getVelY() >= 0.0) {
          this.owner.setPosY(0.0);
          this.owner.setVel(0.0, 0.0);
          this.setState(this.STATE_LAND);
          this.animation.advance();
        }
        break;
      case this.STATE_HIT:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 5;
          this.owner.setVel(0.0, 0.0);
          this.owner.setShowingTrails(0);
          if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(66.0 * this.owner.dir, -93.0)), point(0, 0), this.owner.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.owner.setVel(-10.0 * this.owner.dir, -10.0);
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
          this.animation.advance();
          this.initState = 0;
          this.delayFrames = 5;
          this.owner.setOnGround(1);
          this.owner.setShowingTrails(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        // STATE_STANDUP is never reached: LAND finishes the move (as in the original).
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
      case this.STATE_STANDUP:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
          this.delayFrames = 3;
          g.main.screen.addEffect(new g.classes.Class_DustSkidEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
