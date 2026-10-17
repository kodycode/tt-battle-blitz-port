import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RobinPunch extends Class_Move {
  fistEffect1: number;
  fistEffect2: number;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_ROBIN_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(1);
    const A = g.assets.ROBIN;
    const vis = list(A.ROBIN_PUNCH_01, A.ROBIN_PUNCH_02, A.ROBIN_PUNCH_03, A.ROBIN_PUNCH_04);
    const att = list(A.ROBIN_PUNCH_01A, g.MEMBER_0, A.ROBIN_PUNCH_03A, g.MEMBER_0);
    const def = list(A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D);
    // 1-based indices into vis, as in Lingo.
    const order = list(2, 2, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4);
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

  reset(arg?: any): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.fistEffect1 = 0;
    this.fistEffect2 = 0;
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age > 1) this.animation.advance();
    this.moveDone = this.animation.isDone();
    switch (this.animation.orderIndex) {
      case 1:
        g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
        break;
      case 3:
      case 4:
      case 5:
        if (this.hitOpponent && !this.fistEffect1) {
          this.fistEffect1 = 1;
          if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(61.0 * this.owner.dir, -116.0)), point(0, 0), this.owner.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        break;
      case 8:
      case 9:
      case 10:
        if (this.hitOpponent && !this.fistEffect2) {
          this.fistEffect2 = 1;
          if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
            g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(77.0 * this.owner.dir, -99.0)), point(0, 0), this.owner.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        break;
    }
  }
}
