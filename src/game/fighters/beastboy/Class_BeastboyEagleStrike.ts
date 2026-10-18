import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_BeastboyEagleStrike extends Class_Move {
  STATE_LAUNCH: number;
  STATE_ATTACK: number;
  STATE_HIT: number;
  STATE_UNTRANSFORM: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  STATE_STANDUP: number;
  moveState: number;
  initState: number;
  stateAge: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_BEASTBOY_EAGLE_STRIKE;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.BEASTBOY;
    const vis = list(A.BEASTBOY_JUMP_02, A.BEASTBOY_JUMP_TRANSFORM_02, A.BEASTBOY_EAGLE_TRANSFORM_01, A.BEASTBOY_EAGLE_01, A.BEASTBOY_EAGLE_02, A.BEASTBOY_EAGLE_03, A.BEASTBOY_EAGLE_TRANSFORM_03, A.BEASTBOY_JUMP_04, A.BEASTBOY_STANDUP_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, A.BEASTBOY_EAGLE_02A, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.BEASTBOY_JUMP_02D, A.BEASTBOY_JUMP_02D, A.BEASTBOY_EAGLE_01D, A.BEASTBOY_EAGLE_01D, A.BEASTBOY_EAGLE_01D, A.BEASTBOY_EAGLE_01D, A.BEASTBOY_EAGLE_01D, A.BEASTBOY_JUMP_04D, A.BEASTBOY_STANDUP_01D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 1, 3, 4, 5, 6, 7, 6, 7, 6, 2, 1, 2, 1, 8, 9);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_ATTACK = 2;
    this.STATE_HIT = 3;
    this.STATE_UNTRANSFORM = 4;
    this.STATE_DESCENT = 5;
    this.STATE_LAND = 6;
    this.STATE_STANDUP = 7;
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

  reset(_arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  // Lingo `on advanceState me` / `on setState me, state` (Class_Move has no setState, so no clash).
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
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORM, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.stateAge === 5) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setVel(30.0 * this.owner.dir, 30.0);
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_BIRD, 100, g.SFX_EVENT_PRIORITY_LOW);
          this.owner.setShowingTrails(1);
        }
        if (this.hitOpponent) {
          this.owner.setVel(0.0, 0.0);
          this.animation.advance();
          this.advanceState();
        } else if (this.owner.getPosY() + this.owner.getVelY() >= 30.0) {
          this.owner.setPosY(30.0);
          this.owner.setVel(0.0, 0.0);
          this.setState(this.STATE_UNTRANSFORM);
        } else {
          this.owner.accelerate(point(3.0 * this.owner.dir, 0.0));
        }
        break;
      case this.STATE_HIT:
        if (this.initState) {
          this.initState = 0;
          this.owner.setShowingTrails(0);
          if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(74.0 * this.owner.dir, -52.0)), point(0, 0), this.owner.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        if (this.stateAge === 5) this.advanceState();
        break;
      case this.STATE_UNTRANSFORM:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORMBACK, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.stateAge === 8) {
          if (this.hasHitOpponent()) this.advanceState();
          else this.setState(this.STATE_LAND);
        }
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
          this.owner.setPosY(0.0);
          this.owner.setOnGround(1);
          this.owner.setShowingTrails(0);
          this.animation.orderIndex = 15;
          this.animation.advance();
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 6) this.moveDone = 1;
        break;
      case this.STATE_STANDUP:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
          g.main.screen.addEffect(new g.classes.Class_DustSkidEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
        }
        if (this.stateAge === 6) this.moveDone = 1;
        break;
    }
  }
}
