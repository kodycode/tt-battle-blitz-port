import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_MammothJumpPunch extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT_1: number;
  STATE_ASCENT_2: number;
  STATE_ASCENT_3: number;
  STATE_ATTACK: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_MAMMOTH_JUMP_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.MAMMOTH;
    const vis = list(A.MAMMOTH_JUMP_01, A.MAMMOTH_JUMPPUNCH_01, A.MAMMOTH_JUMPPUNCH_02, A.MAMMOTH_JUMPPUNCH_03, A.MAMMOTH_JUMPPUNCH_04, A.MAMMOTH_JUMPPUNCH_05, A.MAMMOTH_JUMP_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, A.MAMMOTH_JUMPPUNCH_04A, g.MEMBER_0, g.MEMBER_0);
    const def = list(
      A.MAMMOTH_JUMP_01D,
      A.MAMMOTH_JUMPPUNCH_01D,
      A.MAMMOTH_JUMPPUNCH_02D,
      A.MAMMOTH_JUMPPUNCH_03D,
      A.MAMMOTH_JUMPPUNCH_04D,
      A.MAMMOTH_JUMPPUNCH_05D,
      A.MAMMOTH_JUMP_01D,
    );
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT_1 = 2;
    this.STATE_ASCENT_2 = 3;
    this.STATE_ASCENT_3 = 4;
    this.STATE_ATTACK = 5;
    this.STATE_DESCENT = 6;
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

  // Lingo `on advanceState` (handler without `me`, called locally): method here.
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
          this.delayFrames = 4;
          g.main.screen.addEffect(new g.classes.Class_WhiteBurstReverseEffect(this.owner, this.owner.pos.add(point(-66.0 * this.owner.dir, -41.0)), point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_JUMPSPIN, 80, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setOnGround(0);
          this.delayFrames = 2;
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_0, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.owner.moveBy(0.0, -10.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        this.owner.moveBy(0.0, -10.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ASCENT_3:
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
          this.delayFrames = 6;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 4;
        }
        this.owner.moveBy(0.0, 10.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setOnGround(1);
          this.delayFrames = 3;
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_BIG_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_JUMPSPINMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(107.0 * this.owner.dir, -94.0)), point(0, 0), this.owner.dir));
      g.main.screen.addEffect(new g.classes.Class_WhiteBurstReverseEffect(this.owner, this.owner.pos.add(point(107.0 * this.owner.dir, -94.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_JUMPSPINHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
