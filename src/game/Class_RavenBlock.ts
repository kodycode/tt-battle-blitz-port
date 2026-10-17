import { g, list } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RavenBlock extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.defenseRating = g.DEFENSE_BLOCK_DEFAULT;
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(1);
    const A = g.assets.RAVEN;
    const vis = list(A.RAVEN_DUCK_01);
    const att = list(g.MEMBER_0);
    const def = list(A.RAVEN_DUCK_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
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
}
