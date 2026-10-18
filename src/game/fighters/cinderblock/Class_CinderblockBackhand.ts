import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CinderblockBackhand extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CINDERBLOCK_BACKHAND;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.CINDERBLOCK;
    const vis = list(A.CINDERBLOCK_BACKHAND_01, A.CINDERBLOCK_BACKHAND_02, A.CINDERBLOCK_BACKHAND_03, A.CINDERBLOCK_BACKHAND_04, A.CINDERBLOCK_BACKHAND_05);
    const att = list(g.MEMBER_0, A.CINDERBLOCK_BACKHAND_02A, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_BACKHAND_01D, A.CINDERBLOCK_BACKHAND_02D, A.CINDERBLOCK_BACKHAND_03D, A.CINDERBLOCK_BACKHAND_04D, A.CINDERBLOCK_BACKHAND_05D);
    const order = list(1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4);
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
    super.update();
    if (this.age === 1) {
      g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_BACKHANDWOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 7 || this.age === 9 || this.age === 11) {
      g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.add(point(80.0 * this.owner.dir, 0.0)), point(15.0 * this.owner.dir, 0.0), -this.owner.dir));
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_BACKHANDMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.opponent.pos.add(point(20.0 * -this.owner.dir, -70.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_BACKHANDHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
