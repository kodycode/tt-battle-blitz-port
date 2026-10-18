import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_JinxKick extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT_1: number;
  STATE_ASCENT_2: number;
  STATE_ATTACK: number;
  STATE_DESCENT_1: number;
  STATE_DESCENT_2: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_JINX_KICK;
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
    this.STATE_DESCENT_1 = 5;
    this.STATE_DESCENT_2 = 6;
    this.STATE_LAND = 7;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
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
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  // Lingo `on advanceState` (handler without `me`, called locally): a method here.
  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
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
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setOnGround(0);
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, o.pos, point(0, 0), o.dir));
          this.delayFrames = 2;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_0, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        o.moveBy(0.0, -5.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        o.moveBy(0.0, -5.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 4;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        o.moveBy(0.0, 5.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        o.moveBy(0.0, 5.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setOnGround(1);
          this.delayFrames = 3;
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(o, o.pos, point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }

  // ORIGINAL BUG: the ancestor's result is discarded and nothing is returned (VOID), so
  // Class_Fighter.processCollisions always awards 0 points for this kick.
  opponentHit(): any {
    super.opponentHit();
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else {
      g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(91.0 * this.owner.dir, -99.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
    return undefined;
  }
}
