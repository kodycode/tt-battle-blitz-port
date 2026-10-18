import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CinderblockPunch extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CINDERBLOCK_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.CINDERBLOCK;
    const vis = list(A.CINDERBLOCK_PUNCH_04, A.CINDERBLOCK_PUNCH_05, A.CINDERBLOCK_PUNCH_06);
    const att = list(g.MEMBER_0, A.CINDERBLOCK_PUNCH_05A, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_PUNCH_04D, A.CINDERBLOCK_PUNCH_05D, A.CINDERBLOCK_PUNCH_06D);
    const order = list(1, 1, 1, 2, 2, 2, 2, 3, 3, 3);
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
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(100.0 * this.owner.dir, -40.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
