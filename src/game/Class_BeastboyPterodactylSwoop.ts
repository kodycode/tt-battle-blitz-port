import { g, list, point, Member, LList } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_BeastboyPterodactylSwoop extends Class_Move {
  STATE_TRANSFORM: number;
  STATE_FLY: number;
  STATE_ATTACK: number;
  STATE_UNTRANSFORM: number;
  moveState: number;
  initState: number;
  stateAge: number;
  transformAnim: any;
  transformAttMembers: LList<Member>;
  transformDefMembers: LList<Member>;
  attackAnim: any;
  attackAttMembers: LList<Member>;
  attackDefMembers: LList<Member>;
  untransformAnim: any;
  untransformAttMembers: LList<Member>;
  untransformDefMembers: LList<Member>;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_BEASTBOY_PTERODACTYL_SWOOP;
    this.stunDuration = 10;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.BEASTBOY;
    const S = g.assets.CHAR_SHARED;
    let vis = list(A.BEASTBOY_STAND_TRANSFORM_01, A.BEASTBOY_STAND_01, A.BEASTBOY_CROUCH_01, A.BEASTBOY_CROUCH_TRANSFORM_01, A.BEASTBOY_PTERODACTYL_TRANSFORM_01, S.BEASTBOY_PTERODACTYL_01);
    let att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    let def = list(A.BEASTBOY_STAND_01D, A.BEASTBOY_STAND_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_PTERODACTYL_01D, A.BEASTBOY_PTERODACTYL_01D);
    // 1-based indices into vis, as in Lingo.
    let order = list(1, 2, 3, 4, 3, 4, 5, 6, 5, 6);
    const transformVisMembers = vis;
    this.transformAttMembers = att;
    this.transformDefMembers = def;
    this.transformAnim = new g.classes.Class_IndexedAnimation(transformVisMembers, order);
    vis = list(S.BEASTBOY_PTERODACTYL_02, S.BEASTBOY_PTERODACTYL_03);
    att = list(A.BEASTBOY_PTERODACTYL_02A, A.BEASTBOY_PTERODACTYL_02A);
    def = list(A.BEASTBOY_PTERODACTYL_02D, A.BEASTBOY_PTERODACTYL_02D);
    const attackVisMembers = vis;
    this.attackAttMembers = att;
    this.attackDefMembers = def;
    this.attackAnim = new g.classes.Class_PlayOnceAnimation(attackVisMembers);
    vis = list(A.BEASTBOY_PTERODACTYL_TRANSFORM_02, S.BEASTBOY_PTERODACTYL_02, A.BEASTBOY_JUMP_TRANSFORM_02, A.BEASTBOY_JUMP_02);
    att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    def = list(A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_RHINO_RUN_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_CROUCH_01D);
    order = list(1, 2, 1, 3, 4, 3, 4);
    const untransformVisMembers = vis;
    this.untransformAttMembers = att;
    this.untransformDefMembers = def;
    this.untransformAnim = new g.classes.Class_IndexedAnimation(untransformVisMembers, order);
    this.animation = this.transformAnim;
    this.attackMasks = this.transformAttMembers;
    this.defenseMasks = this.transformDefMembers;
    this.STATE_TRANSFORM = 1;
    this.STATE_FLY = 2;
    this.STATE_ATTACK = 3; // never used by update
    this.STATE_UNTRANSFORM = 4;
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
      case this.STATE_FLY:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.attackAnim;
          this.attackMasks = this.attackAttMembers;
          this.defenseMasks = this.attackDefMembers;
          this.owner.setOnGround(0);
          this.owner.setShowingTrails(1);
          this.owner.setVel(35.0 * this.owner.dir, 0.0);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_BEASTBOY_PTERODACTYL, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge % 3 === 1) this.animation.advance();
        if (this.stateAge >= 12) {
          this.setState(this.STATE_UNTRANSFORM);
        } else if (this.stateAge > 10) {
          this.owner.setVel(this.owner.getVel().mul(0.5));
        } else {
          this.owner.accelerate(g.gravity.neg());
        }
        break;
      case this.STATE_UNTRANSFORM:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.untransformAnim;
          this.attackMasks = this.untransformAttMembers;
          this.defenseMasks = this.untransformDefMembers;
          this.owner.setVel(0.0, 0.0);
          g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORMBACK, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge > 1) this.animation.advance();
        if (this.animation.isDone()) this.moveDone = 1;
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_HIGH);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(75.0 * this.owner.dir, -100.0)), this.owner.vel, this.owner.dir));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_HIGH);
    return 1;
  }
}
