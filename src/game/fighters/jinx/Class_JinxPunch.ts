import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_JinxPunch extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_JINX_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.JINX;
    const vis = list(A.JINX_PUNCH_01, A.JINX_PUNCH_02, A.JINX_PUNCH_03);
    const att = list(g.MEMBER_0, A.JINX_PUNCH_02A, g.MEMBER_0);
    const def = list(A.JINX_PUNCH_01D, A.JINX_PUNCH_02D, A.JINX_PUNCH_03D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3);
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
    if (this.age === 2) {
      g.main.screen.addEffect(new g.classes.Class_JinxPunchEffect(this.owner, this.owner.pos.add(point(52.0 * this.owner.dir, -87.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_MAKE_ENERGY_BALL, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
