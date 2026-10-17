import { g, Point, LList, Member, list, point, abs, voidp } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_PlasmusCrabProjectile extends Class_Projectile {
  STATE_SEEK: number;
  STATE_BITE: number;
  animState: number;
  initState: number;
  walkAnim: any;
  walkAttMembers: LList<Member>;
  biteAnim: any;
  biteAttMembers: LList<Member>;
  stateAge: number;
  shadow: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_PLASMUS_CRAB_THROW;
    this.stunDuration = 10;
    this.STATE_SEEK = 1;
    this.STATE_BITE = 2;
    this.initState = 1;
    this.animState = 1;
    this.stateAge = 0;
    const A = g.assets.PLASMUS;
    let vis = list(A.PLASMUS_CRAB_01, A.PLASMUS_CRAB_02, A.PLASMUS_CRAB_03);
    let def = list(A.PLASMUS_CRAB_01D, A.PLASMUS_CRAB_02D, A.PLASMUS_CRAB_03D);
    let att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const walkVisMembers = vis;
    this.walkAttMembers = att;
    this.walkAnim = new g.classes.Class_LoopedAnimation(walkVisMembers);
    this.walkAnim.setRepeat(3);
    vis = list(A.PLASMUS_CRAB_04, A.PLASMUS_CRAB_05, A.PLASMUS_CRAB_06);
    def = list(A.PLASMUS_CRAB_03D, A.PLASMUS_CRAB_03D, A.PLASMUS_CRAB_03D);
    att = list(g.MEMBER_0, A.PLASMUS_CRAB_06A, A.PLASMUS_CRAB_06A);
    const order = list(1, 1, 2, 2, 2, 3, 3, 3, 3);
    const biteVisMembers = vis;
    this.biteAttMembers = att;
    this.biteAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.animation = this.walkAnim;
    this.attackMasks = this.walkAttMembers;
    this.shadow = new g.classes.Class_Shadow(this, 70);
  }

  destroy(): undefined {
    super.destroy();
    if (!voidp(this.shadow)) this.shadow.destroy();
    return undefined;
  }

  // ORIGINAL BUG: ignores i and just increments animState.
  setState(_i: number): void {
    this.initState = 1;
    this.animState = this.animState + 1;
    this.stateAge = 0;
  }

  advanceState(): void {
    this.setState(this.animState + 1);
  }

  melt(): void {
    g.main.screen.addEffect(new g.classes.Class_PlasmusCrabMeltEffect(this.owner, this.pos, point(0, 0), this.dir));
    this.kill();
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (!this.alive) return;
    switch (this.animState) {
      case this.STATE_SEEK:
        if (this.initState) this.initState = 0;
        if (this.stateAge > 180) {
          this.melt();
        } else {
          if (this.stateAge > 1) this.animation.advance();
          const diffX = this.owner.opponent.getPosX() - this.getPosX();
          const diffY = this.owner.opponent.getPosY() - this.getPosY();
          if (diffX > 0.0) this.setDir(1);
          else if (diffX < 0.0) this.setDir(-1);
          this.visSprite.flipH = this.dir < 0;
          if (abs(diffX) < 80.0 && abs(diffY) < 100.0) {
            this.setVel(point(0.0, 0.0));
            this.setState(this.STATE_BITE);
          } else {
            this.accelerate(point(2.0 * this.dir, 0.0));
            if (abs(this.getVelX()) > 35.0) this.setVelX(35.0 * this.dir);
          }
        }
        break;
      case this.STATE_BITE:
        if (this.initState) {
          this.initState = 0;
          this.animation = this.biteAnim;
          this.attackMasks = this.biteAttMembers;
          this.shadow = this.shadow.destroy();
          g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_CRABBITE, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.animation.isDone()) {
          this.melt();
        } else if (this.stateAge > 1) {
          this.animation.advance();
        }
        break;
    }
    const tmpPos = this.pos.add(this.vel.mul(g.gameSpeed));
    const newPos = g.main.screen.scene.constrainToBounds(tmpPos.duplicate());
    if (!newPos.equals(tmpPos)) {
      this.melt();
      return;
    }
    this.setPos(newPos);
    this.visSprite.member = this.animation.getMember();
    this.updateBoundingBoxes();
    if (!voidp(this.shadow)) this.shadow.update();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCHMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_PUNCH_HIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }

  paint(): void {
    super.paint();
    if (!voidp(this.shadow)) this.shadow.paint();
  }
}
