import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CinderblockDoublePunch extends Class_Move {
  fistEffect1: number;
  fistEffect2: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CINDERBLOCK_DOUBLE_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.CINDERBLOCK;
    const vis = list(A.CINDERBLOCK_PUNCH_01, A.CINDERBLOCK_PUNCH_02, A.CINDERBLOCK_PUNCH_03, A.CINDERBLOCK_PUNCH_04, A.CINDERBLOCK_PUNCH_05, A.CINDERBLOCK_PUNCH_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.CINDERBLOCK_PUNCH_03A, g.MEMBER_0, A.CINDERBLOCK_PUNCH_05A, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_PUNCH_01D, A.CINDERBLOCK_PUNCH_02D, A.CINDERBLOCK_PUNCH_03D, A.CINDERBLOCK_PUNCH_04D, A.CINDERBLOCK_PUNCH_05D, A.CINDERBLOCK_PUNCH_06D);
    const order = list(1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.fistEffect1 = 0;
    this.fistEffect2 = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.fistEffect1 = 0;
    this.fistEffect2 = 0;
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
    if (this.hitOpponent) {
      switch (this.animation.orderIndex) {
        case 1:
          // ORIGINAL BUG: inside `if hitOpponent`, so the woosh never plays (hitOpponent is 0 at orderIndex 1).
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
          break;
        case 6:
        case 7:
        case 8:
          if (!this.fistEffect1) {
            this.fistEffect1 = 1;
            if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
              g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
              g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
            } else {
              g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(110.0 * this.owner.dir, -55.0)), point(0, 0), this.owner.dir));
              g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            }
          }
          break;
        case 10:
        case 11:
        case 12:
          if (!this.fistEffect2) {
            this.fistEffect2 = 1;
            if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
              g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
              g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
            } else {
              g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(100.0 * this.owner.dir, -40.0)), point(0, 0), this.owner.dir));
              g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            }
          }
          break;
      }
    }
  }
}
