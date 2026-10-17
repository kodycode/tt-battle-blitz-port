import { g, list, point, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_PlasmusArmSwipe extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_PLASMUS_ARM_SWIPE;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_ARMSWIPE_01, A.PLASMUS_ARMSWIPE_02, A.PLASMUS_ARMSWIPE_03, A.PLASMUS_ARMSWIPE_04);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.PLASMUS_ARMSWIPE_03A, g.MEMBER_0);
    const def = list(A.PLASMUS_ARMSWIPE_01D, A.PLASMUS_ARMSWIPE_02D, A.PLASMUS_ARMSWIPE_03D, A.PLASMUS_ARMSWIPE_04D);
    const order = list(1, 1, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4);
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
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_ROAR_BIG, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCH_1, 100, g.SFX_EVENT_PRIORITY_LOW);
    } else if (this.age === 5) {
      g.main.screen.addEffect(new g.classes.Class_PlasmusArmSwipeTrailsEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
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
