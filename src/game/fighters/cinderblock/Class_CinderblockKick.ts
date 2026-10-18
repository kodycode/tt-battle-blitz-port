import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CinderblockKick extends Class_Move {
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
    const vis = list(A.CINDERBLOCK_STOMP_01, A.CINDERBLOCK_STOMP_02, A.CINDERBLOCK_STOMP_03, A.CINDERBLOCK_STOMP_04);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.CINDERBLOCK_STOMP_03A, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_STOMP_01D, A.CINDERBLOCK_STOMP_02D, A.CINDERBLOCK_STOMP_03D, A.CINDERBLOCK_STOMP_04D);
    const order = list(1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4);
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
    if (this.age === 10) {
      g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.add(point(80.0 * this.owner.dir, 0.0)), point(5.0 * this.owner.dir, 0.0), -this.owner.dir));
      g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.add(point(-40.0 * this.owner.dir, 0.0)), point(-5.0 * this.owner.dir, 0.0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALL_SLAM, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(80.0 * this.owner.dir, -30.0)), point(0, 0), 1));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
