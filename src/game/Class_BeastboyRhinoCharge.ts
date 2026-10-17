import { g, list, point, abs, Point, Member, LList } from '../runtime';
import { Class_Move } from './Class_Move';

// Lingo `<` / `>` on two points compares them like lists, element by element; the result is true only
// when the comparison holds for every element (Director / ScummVM semantics).
// TODO(runtime): a shared helper for Lingo point/list comparison would be better placed in lingo.ts.
function pointLt(a: Point, b: Point): boolean {
  return a.locH < b.locH && a.locV < b.locV;
}
function pointGt(a: Point, b: Point): boolean {
  return a.locH > b.locH && a.locV > b.locV;
}

export class Class_BeastboyRhinoCharge extends Class_Move {
  STATE_TRANSFORM: number;
  STATE_RUSH: number;
  STATE_SLIDE: number;
  STATE_ATTACK: number;
  STATE_SKID: number;
  STATE_UNTRANSFORM: number;
  moveState: number;
  initState: number;
  stateAge: number;
  transformAnim: any;
  transformAttMembers: LList<Member>;
  transformDefMembers: LList<Member>;
  rushAnim: any;
  rushAttMembers: LList<Member>;
  rushDefMembers: LList<Member>;
  attackAnim: any;
  attackAttMembers: LList<Member>;
  attackDefMembers: LList<Member>;
  untransformAnim: any;
  untransformAttMembers: LList<Member>;
  untransformDefMembers: LList<Member>;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_BEASTBOY_RHINO_CHARGE;
    this.stunDuration = 10;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.BEASTBOY;
    let vis = list(A.BEASTBOY_STAND_TRANSFORM_01, A.BEASTBOY_STAND_01, A.BEASTBOY_CROUCH_01, A.BEASTBOY_CROUCH_TRANSFORM_01, A.BEASTBOY_RHINO_TRANSFORM_01, A.BEASTBOY_RHINO_RUN_01);
    let att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    let def = list(A.BEASTBOY_STAND_01D, A.BEASTBOY_STAND_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D);
    // 1-based indices into vis, as in Lingo.
    let order = list(1, 2, 3, 4, 3, 4, 5, 6, 5, 6);
    const transformVisMembers = vis;
    this.transformAttMembers = att;
    this.transformDefMembers = def;
    this.transformAnim = new g.classes.Class_IndexedAnimation(transformVisMembers, order);
    vis = list(A.BEASTBOY_RHINO_RUN_02, A.BEASTBOY_RHINO_RUN_03, A.BEASTBOY_RHINO_RUN_04, A.BEASTBOY_RHINO_RUN_01);
    att = list(A.BEASTBOY_RHINO_ATTACK_02A, A.BEASTBOY_RHINO_ATTACK_02A, A.BEASTBOY_RHINO_ATTACK_02A, A.BEASTBOY_RHINO_ATTACK_02A);
    def = list(A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D);
    const rushVisMembers = vis;
    this.rushAttMembers = att;
    this.rushDefMembers = def;
    this.rushAnim = new g.classes.Class_LoopedAnimation(rushVisMembers);
    vis = list(A.BEASTBOY_RHINO_ATTACK_01, A.BEASTBOY_RHINO_ATTACK_02);
    att = list(A.BEASTBOY_RHINO_ATTACK_02A, A.BEASTBOY_RHINO_ATTACK_02A);
    def = list(A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D);
    const attackVisMembers = vis;
    this.attackAttMembers = att;
    this.attackDefMembers = def;
    this.attackAnim = new g.classes.Class_PlayOnceAnimation(attackVisMembers);
    vis = list(A.BEASTBOY_RHINO_TRANSFORM_02, A.BEASTBOY_RHINO_ATTACK_02, A.BEASTBOY_CROUCH_TRANSFORM_01, A.BEASTBOY_CROUCH_01, A.BEASTBOY_STAND_01, A.BEASTBOY_STAND_TRANSFORM_01);
    att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    def = list(A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_STAND_01D, A.BEASTBOY_STAND_01D);
    order = list(1, 2, 1, 3, 4, 3, 4, 5, 6, 5);
    const untransformVisMembers = vis;
    this.untransformAttMembers = att;
    this.untransformDefMembers = def;
    this.untransformAnim = new g.classes.Class_IndexedAnimation(untransformVisMembers, order);
    this.animation = this.transformAnim;
    this.attackMasks = this.transformAttMembers;
    this.defenseMasks = this.transformDefMembers;
    this.STATE_TRANSFORM = 1;
    this.STATE_RUSH = 2;
    this.STATE_SLIDE = 3;
    this.STATE_ATTACK = 4;
    this.STATE_SKID = 5;
    this.STATE_UNTRANSFORM = 6;
    this.moveState = 1;
    this.initState = 1;
    // (Lingo also assigns `delayFrames = 0` here: not a property of this script, so a dead local.)
  }

  reset(_arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.transformAnim.reset();
    this.rushAnim.reset();
    this.attackAnim.reset();
    this.untransformAnim.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    super.stop();
    g.main.audioMgr.stopSound(g.assets.BEASTBOY.SFX_BEASTBOY_RHINOGALLOP);
    this.owner.setShaking(0);
    this.owner.setShowingTrails(0);
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
      case this.STATE_TRANSFORM:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.transformAnim;
          this.attackMasks = this.transformAttMembers;
          this.defenseMasks = this.transformDefMembers;
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORM, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.animation.isDone()) this.advanceState();
        break;
      case this.STATE_RUSH:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.rushAnim;
          this.attackMasks = this.rushAttMembers;
          this.defenseMasks = this.rushDefMembers;
          this.owner.setShowingTrails(1);
          this.owner.setVel(35.0 * this.owner.dir, 0.0);
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_RHINOGALLOP, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.stateAge % 3 === 0) {
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, point(this.owner.getPosX(), 0.0), point(0, 0), this.owner.dir));
        }
        if (this.hitOpponent) this.owner.opponent.moveBy(this.owner.getVelX(), 0.0);
        if (!this.owner.groundCheck(this.owner.pos.add(this.owner.vel))) {
          this.setState(this.STATE_UNTRANSFORM);
        } else if (
          // ORIGINAL BUG (probably): point `<` / `>` needs BOTH coordinates to compare that way, so with
          // both fighters at the same height the "ran past the opponent" test is never true.
          (this.owner.dir < 0 && pointLt(this.owner.pos, this.owner.opponent.pos)) ||
          (this.owner.dir > 0 && pointGt(this.owner.pos, this.owner.opponent.pos)) ||
          this.hitOpponent ||
          this.stateAge >= 60
        ) {
          this.advanceState();
        }
        break;
      case this.STATE_SLIDE:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.attackAnim;
          this.attackMasks = this.attackAttMembers;
          this.defenseMasks = this.attackDefMembers;
          g.main.audioMgr.stopSound(g.assets.BEASTBOY.SFX_BEASTBOY_RHINOGALLOP);
        }
        // The Lingo calls accelerate(-2.0 * dir) with ONE argument: Class_Actor.accelerate then builds
        // point(float(a1), float(VOID)); VOID counts as 0 in Lingo arithmetic, so the y part is 0.
        // TODO(runtime): Class_Actor.accelerate(x) with a2 omitted gives NaN in TS; 0.0 is passed explicitly here.
        if (abs(this.owner.getVelX()) > 0.0) this.owner.accelerate(-2.0 * this.owner.dir, 0.0);
        if (this.hitOpponent) this.owner.opponent.moveBy(this.owner.getVelX(), 0.0);
        if (!this.owner.groundCheck(this.owner.pos.add(this.owner.vel))) {
          this.setState(this.STATE_UNTRANSFORM);
        } else if (this.stateAge > 6) {
          if (this.hitOpponent) this.setState(this.STATE_ATTACK);
          else this.setState(this.STATE_SKID);
        }
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
        }
        if (abs(this.owner.getVelX()) > 0.0) this.owner.accelerate(-2.0 * this.owner.dir, 0.0); // see STATE_SLIDE
        if (this.hitOpponent) this.owner.opponent.moveBy(this.owner.getVelX(), 0.0);
        if (this.stateAge >= 10) this.advanceState();
        break;
      case this.STATE_SKID:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.owner.setShowingTrails(0);
        }
        if (abs(this.owner.getVelX()) < 2.0) {
          this.owner.setVelX(0.0);
          this.advanceState();
        } else {
          this.owner.accelerate(-2.0 * this.owner.dir, 0.0); // see STATE_SLIDE
        }
        break;
      case this.STATE_UNTRANSFORM:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.untransformAnim;
          this.attackMasks = this.untransformAttMembers;
          this.defenseMasks = this.untransformDefMembers;
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORMBACK, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.animation.isDone()) {
          this.owner.setVel(0.0, 0.0);
          this.moveDone = 1;
        }
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_RHINOMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(75.0 * this.owner.dir, -100.0)), this.owner.vel, this.owner.dir));
    g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_RHINOHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
