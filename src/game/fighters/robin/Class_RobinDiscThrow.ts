import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_RobinDiscThrow extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.attackDamage = g.DAMAGE_ROBIN_DISC_THROW;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.ROBIN;
    const vis = list(
      A.ROBIN_THROW_01,
      A.ROBIN_THROW_02,
      A.ROBIN_DISCTHROW_03,
      A.ROBIN_DISCTHROW_04,
      A.ROBIN_DISCTHROW_05,
      A.ROBIN_DISCTHROW_06,
      A.ROBIN_DISCTHROW_07,
      A.ROBIN_THROW_08,
      A.ROBIN_THROW_09,
    );
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const D3 = A.ROBIN_DISCTHROW_03D;
    const def = list(A.ROBIN_THROW_01D, A.ROBIN_THROW_02D, D3, D3, D3, D3, D3, D3, D3);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 5, 6, 6, 7, 8, 9);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.STATE_FINISH = 3;
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
    this.projectile = undefined;
    this.owner.setOnGround(1);
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
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.age > 1) this.animation.advance();
        if (this.animation.orderIndex === 8) this.advanceState();
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 10;
          this.projectile = new g.classes.Class_RobinDiscProjectile(this.owner, this.owner.pos.add(point(80 * this.owner.dir, -40)), point(0, 0), this.owner.dir);
          g.main.screen.addProjectile(this.projectile);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.projectile = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
