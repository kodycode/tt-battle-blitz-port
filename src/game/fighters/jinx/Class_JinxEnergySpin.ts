import { g, list, point, Point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_JinxEnergySpin extends Class_Move {
  projectile: any;

  // Class_Jinx creates this with only the owner; the extra Lingo parameters are VOID and unused.
  constructor(owner: any, _initPos?: Point, _initVel?: Point, _initDir?: number) {
    super(owner);
    this.attackDamage = g.DAMAGE_JINX_ENERGY_SPIN;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.JINX;
    const vis = list(A.JINX_JUMP_01, A.JINX_SPIN_01, A.JINX_SPIN_02, A.JINX_SPIN_03, A.JINX_SPIN_04, A.JINX_SPIN_05, A.JINX_JUMP_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.JINX_SPIN_02A, A.JINX_SPIN_03A, A.JINX_SPIN_04A, A.JINX_SPIN_05A, g.MEMBER_0);
    const def = list(A.JINX_JUMP_01D, A.JINX_SPIN_01D, A.JINX_SPIN_02D, A.JINX_SPIN_03D, A.JINX_SPIN_04D, A.JINX_SPIN_05D, A.JINX_JUMP_06D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age > 1) this.animation.advance();
    this.moveDone = this.animation.isDone();
    if (this.age === 1) {
      g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_ENERGY_SPIN, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 8) {
      g.main.screen.addEffect(new g.classes.Class_JinxEnergySpinEffect(this.owner, this.owner.pos.add(point(0.0, -70.0)), point(0, 0), this.owner.dir));
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      return 1;
    }
  }
}
