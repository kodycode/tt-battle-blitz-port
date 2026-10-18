import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_PlasmusPunch extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_PLASMUS_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_PUNCH_01, A.PLASMUS_PUNCH_02, A.PLASMUS_PUNCH_03);
    const att = list(g.MEMBER_0, A.PLASMUS_PUNCH_02A, g.MEMBER_0);
    const def = list(A.PLASMUS_PUNCH_01D, A.PLASMUS_PUNCH_02D, A.PLASMUS_PUNCH_03D);
    const order = list(1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3);
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
    if (this.age === 1) {
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCH_1, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 4) {
      g.main.screen.addEffect(new g.classes.Class_PlasmusPunchTrailsEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
    }
    if (this.age > 1) this.animation.advance();
    this.moveDone = this.animation.isDone();
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCHMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(100.0 * this.owner.dir, -40.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_PUNCH_HIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
