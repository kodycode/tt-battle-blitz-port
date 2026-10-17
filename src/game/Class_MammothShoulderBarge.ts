import { g, Point, Member, LList, list, point, abs } from '../runtime';
import { Class_Move } from './Class_Move';

// Lingo `<=` / `>=` on two points: true only when every component satisfies the comparison
// (element-wise list comparison, as reimplemented by ScummVM's Director engine).
// TODO(runtime): a shared Point comparison helper (e.g. Point.le/ge) would belong in runtime/lingo.ts.
function pointLE(a: Point, b: Point): boolean {
  return a.locH <= b.locH && a.locV <= b.locV;
}
function pointGE(a: Point, b: Point): boolean {
  return a.locH >= b.locH && a.locV >= b.locV;
}

export class Class_MammothShoulderBarge extends Class_Move {
  STATE_CROUCH: number;
  STATE_ATTACK: number;
  STATE_PUSH: number;
  STATE_SLIDE: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  crouchAnim: any;
  crouchAttMembers: LList<Member>;
  crouchDefMembers: LList<Member>;
  attackAnim: any;
  attackAttMembers: LList<Member>;
  attackDefMembers: LList<Member>;
  shake: any; // declared in the Lingo property list, never used

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_MAMMOTH_SHOULDER_BARGE;
    this.stunDuration = 10;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.MAMMOTH;
    let vis = list(A.MAMMOTH_JUMP_01);
    let att = list(g.MEMBER_0);
    let def = list(A.MAMMOTH_JUMP_01D);
    const crouchVisMembers = vis;
    this.crouchAttMembers = att;
    this.crouchDefMembers = def;
    this.crouchAnim = new g.classes.Class_LoopedAnimation(crouchVisMembers);
    vis = list(A.MAMMOTH_WALK_01, A.MAMMOTH_WALK_02, A.MAMMOTH_WALK_03, A.MAMMOTH_WALK_04, A.MAMMOTH_WALK_05, A.MAMMOTH_WALK_06);
    const SA = A.MAMMOTH_SHOULDERBARGE_01A;
    att = list(SA, SA, SA, SA, SA, SA);
    const D = A.MAMMOTH_STAND_01D;
    def = list(D, D, D, D, D, D);
    const attackVisMembers = vis;
    this.attackAttMembers = att;
    this.attackDefMembers = def;
    this.attackAnim = new g.classes.Class_LoopedAnimation(attackVisMembers);
    this.animation = this.crouchAnim;
    this.attackMasks = this.crouchAttMembers;
    this.defenseMasks = this.crouchDefMembers;
    this.STATE_CROUCH = 1;
    this.STATE_ATTACK = 2;
    this.STATE_PUSH = 3;
    this.STATE_SLIDE = 4;
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
    this.crouchAnim.reset();
    this.attackAnim.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    super.stop();
    g.main.audioMgr.stopSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOULDER_BARGE_RUN);
    this.owner.setShaking(0);
    this.owner.setShowingTrails(0);
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
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.crouchAnim;
          this.attackMasks = this.crouchAttMembers;
          this.defenseMasks = this.crouchDefMembers;
          this.owner.setShaking(1);
          this.delayFrames = 5;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.attackAnim;
          this.attackMasks = this.attackAttMembers;
          this.defenseMasks = this.attackDefMembers;
          this.owner.setVel(35.0 * this.owner.dir, 0.0);
          this.owner.setShaking(0);
          this.owner.setShowingTrails(1);
          g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOULDER_BARGE_RUN, 100, g.SFX_EVENT_PRIORITY_HIGH);
        }
        this.animation.advance();
        if (this.age % 3 === 0) {
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), this.owner.dir));
        }
        if (this.age > 75) {
          this.setState(this.STATE_SLIDE);
        } else if (
          (this.owner.dir < 0 && pointLE(this.owner.pos, this.owner.opponent.pos)) ||
          (this.owner.dir > 0 && pointGE(this.owner.pos, this.owner.opponent.pos))
        ) {
          this.setState(this.STATE_SLIDE);
        } else if (this.hitOpponent) {
          this.advanceState();
        }
        break;
      case this.STATE_PUSH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = this.stunDuration - 1;
        }
        this.animation.advance();
        this.owner.opponent.setPos(this.owner.getPos().add(point(100 * this.owner.dir, 0)));
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_SLIDE:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.crouchAnim;
          this.attackMasks = this.crouchAttMembers;
          this.defenseMasks = this.crouchDefMembers;
          this.animation.reset();
          if (this.hitOpponent) {
            this.owner.setVelX(this.owner.dir * 20.0);
            this.owner.opponent.setVelX(20.0 * this.owner.dir);
          }
          this.owner.setShowingTrails(0);
          g.main.audioMgr.stopSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOULDER_BARGE_RUN);
        }
        if (abs(this.owner.getVelX()) > 5.0) {
          this.owner.accelerate(point(-1.0 * this.owner.dir, 0.0));
        } else {
          this.owner.setVel(0.0, 0.0);
          this.moveDone = 1;
        }
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOULDERBARGEMISS, 100, g.SFX_EVENT_PRIORITY_HIGH);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(75.0 * this.owner.dir, -100.0)), this.owner.vel, this.owner.dir));
      g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOULDERBARGEHIT, 100, g.SFX_EVENT_PRIORITY_HIGH);
      return 1;
    }
  }
}
