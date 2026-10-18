import { g, Point, Member, LList, list, point, voidp } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

export class Class_RobinBombProjectile extends Class_Projectile {
  STATE_FLY: number;
  STATE_SKID: number;
  STATE_EXPLODE: number;
  animState: number;
  initState: number;
  flyAnim: any;
  flyAttMembers: LList<Member>;
  skidAnim: any;
  skidAttMembers: LList<Member>;
  explodeAnim: any;
  explodeAttMembers: LList<Member>;
  stateAge: number;
  shadow: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_ROBIN_BOMB_THROW;
    this.stunDuration = 10;
    this.STATE_FLY = 1;
    this.STATE_SKID = 2;
    this.STATE_EXPLODE = 3;
    this.initState = 1;
    this.animState = 1;
    this.stateAge = 0;
    const A = g.assets.ROBIN;
    let vis = list(A.ROBIN_BOMB_01, A.ROBIN_BOMB_01);
    let att = list(g.MEMBER_0, g.MEMBER_0);
    const flyVisMembers = vis;
    this.flyAttMembers = att;
    this.flyAnim = new g.classes.Class_LoopedAnimation(flyVisMembers);
    vis = list(A.ROBIN_BOMB_01, A.ROBIN_BOMB_02, A.FX_ROBIN_BOMB_11, A.FX_ROBIN_BOMB_12, A.FX_ROBIN_BOMB_13, A.FX_ROBIN_BOMB_14);
    att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    this.skidAttMembers = att;
    this.skidAnim = new g.classes.Class_PlayOnceAnimation(vis);
    this.skidAnim.setRepeat(2);
    vis = list(
      A.FX_ROBIN_BOMB_15,
      A.FX_ROBIN_BOMB_EXPLODE_01,
      A.FX_ROBIN_BOMB_EXPLODE_02,
      A.FX_ROBIN_BOMB_EXPLODE_03,
      A.FX_ROBIN_BOMB_EXPLODE_04,
      A.FX_ROBIN_BOMB_EXPLODE_05,
      A.FX_ROBIN_BOMB_EXPLODE_06,
      A.FX_ROBIN_BOMB_EXPLODE_07,
      A.FX_ROBIN_BOMB_EXPLODE_08,
      A.FX_ROBIN_BOMB_EXPLODE_09,
      A.FX_ROBIN_BOMB_EXPLODE_10,
      A.FX_ROBIN_BOMB_EXPLODE_11,
      A.FX_ROBIN_BOMB_EXPLODE_12,
    );
    const X = A.FX_ROBIN_BOMB_EXPLODE_02A;
    att = list(g.MEMBER_0, g.MEMBER_0, X, X, X, X, X, X, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    this.explodeAttMembers = att;
    this.explodeAnim = new g.classes.Class_PlayOnceAnimation(vis);
    this.explodeAnim.setRepeat(2);
    this.animation = this.flyAnim;
    this.attackMasks = this.flyAttMembers;
    this.shadow = new g.classes.Class_Shadow(this, 35);
  }

  destroy(): undefined {
    super.destroy();
    if (!voidp(this.shadow)) this.shadow.destroy();
    return undefined;
  }

  // Lingo `on advanceState` (handler without `me`, called locally): method here.
  advanceState(): void {
    this.initState = 1;
    this.animState = this.animState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (!this.alive) return;
    switch (this.animState) {
      case this.STATE_FLY:
        if (this.initState) {
          this.initState = 0;
          this.setVel(20.0 * this.dir, -10.0);
        }
        this.accelerate(g.gravity);
        if (this.stateAge > 1) this.animation.advance();
        if (this.getPosY() + this.getVelY() >= 0.0) {
          this.setPosY(0.0);
          this.setVelY(0.0);
          this.advanceState();
        }
        break;
      case this.STATE_SKID:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.skidAnim;
          // ORIGINAL BUG: uses the explode attack masks (not skidAttMembers), so frames 3-6 of the skid
          // carry the explosion's attack box.
          this.attackMasks = this.explodeAttMembers;
        }
        if (this.stateAge > 1) this.animation.advance();
        // Lingo calls setVel with ONE argument: point(float(x), float(VOID)). The vertical velocity is
        // already 0 here; 0.0 is assumed for the missing argument.
        this.setVel(this.getVelX() * 0.5, 0.0);
        if (this.animation.isDone()) {
          this.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_EXPLODE:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.explodeAnim;
          this.attackMasks = this.explodeAttMembers;
          g.main.screen.addEffect(new g.classes.Class_RobinBombColumnEffect(this.owner, this.pos, point(0, 0), this.dir));
          this.shadow = this.shadow.destroy();
          g.main.audioMgr.playSound(g.assets.ROBIN.SFX_ROBIN_BOMB_EXPLODE, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.animation.isDone()) this.kill();
        else if (this.stateAge > 1) this.animation.advance();
        break;
    }
    // Runs even if kill() was just called above (as in the original).
    this.setPos(this.pos.add(this.vel));
    this.visSprite.member = this.animation.getMember();
    this.updateBoundingBoxes();
    if (this.isOutOfPlay()) this.kill();
    if (!voidp(this.shadow)) this.shadow.update();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      return 1;
    }
  }

  paint(): void {
    super.paint();
    if (!voidp(this.shadow)) this.shadow.paint();
  }
}
