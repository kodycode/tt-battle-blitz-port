import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_CyborgPowerSmash extends Class_Move {
  STATE_LAUNCH: number;
  STATE_ATTACK: number;
  STATE_HIT: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  stateAge: number;
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CYBORG_POWER_SMASH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_CROUCH_01, A.CYBORG_KNEE_01, A.CYBORG_KNEE_02, A.CYBORG_JUMP_02);
    const visAlt = list(A.CYBORG_CROUCH_ALT_01, A.CYBORG_KNEE_ALT_01, A.CYBORG_KNEE_ALT_02, A.CYBORG_JUMP_ALT_02);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.CYBORG_KNEE_02A, g.MEMBER_0);
    const def = list(A.CYBORG_CROUCH_01D, A.CYBORG_KNEE_01D, A.CYBORG_KNEE_02D, A.CYBORG_JUMP_02D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 1);
    this.visAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.visAltAnim = new g.classes.Class_IndexedAnimation(visAlt, order);
    this.animation = this.visAnim;
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_ATTACK = 2;
    this.STATE_HIT = 3;
    this.STATE_DESCENT = 4;
    this.STATE_LAND = 5;
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
    this.owner.setShowingTrails(0);
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
  }

  advanceState(): void {
    this.setState(this.moveState + 1);
  }

  setState(state: number): void {
    this.initState = 1;
    this.moveState = state;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
        }
        if (this.stateAge === 1) {
          g.main.screen.addEffect(new g.classes.Class_WhiteBurstReverseEffect(o, o.pos.add(point(-10.0 * o.dir, -85.0)), point(0, 0), o.dir));
        } else if (this.stateAge === 6) {
          this.animation.advance();
        } else if (this.stateAge === 8) {
          this.advanceState();
        }
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setVel(20.0 * o.dir, -29.2);
          o.setOnGround(0);
          o.setShowingTrails(1);
          g.main.screen.addEffect(new g.classes.Class_CyborgRingEffect(o, o.pos, point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_POWERSMASH, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge >= 8) o.accelerate(g.gravity);
        if (this.stateAge >= 12) this.setState(this.STATE_DESCENT);
        break;
      case this.STATE_HIT:
        if (this.initState) {
          this.initState = 0;
          o.setVel(0.0, 0.0);
          o.setShowingTrails(0);
        }
        if (this.stateAge === 10) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          if (this.hasHitOpponent()) o.setVel(-5.0 * o.dir, -10.0);
          this.animation.advance();
          o.setShowingTrails(0);
          this.initState = 0;
        }
        o.accelerate(g.gravity);
        if (o.fallCheck()) {
          o.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.initState = 0;
          if (!this.hitOpponent) this.animation.advance();
          this.animation.advance();
          this.animation.advance();
          o.setOnGround(1);
          o.setShowingTrails(0);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(o, o.pos, point(0, 0), o.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 6) this.moveDone = 1;
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    this.setState(this.STATE_HIT);
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_FLYINGPUNCHMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(100.0 * this.owner.dir, -40.0)), point(0, 0), this.owner.dir));
      g.main.screen.addEffect(new g.classes.Class_WhiteBurstEffect(this.owner, this.owner.pos.add(point(100.0 * this.owner.dir, -40.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_FLYINGPUNCH, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
