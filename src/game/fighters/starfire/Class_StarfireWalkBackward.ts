import { g, list } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_StarfireWalkBackward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.STARFIRE;
    const vis = list(A.STARFIRE_FLOAT_FWD_01, A.STARFIRE_FALL_02);
    const att = list(g.MEMBER_0, g.MEMBER_0);
    const def = list(A.STARFIRE_FLOAT_FWD_01D, A.STARFIRE_FALL_02D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(1);
    this.owner.setShowingTrails(0);
    this.owner.setVel(-this.owner.dir * this.owner.WALK_SPEED, 0.0);
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age === 2) this.animation.advance();
  }

  getFlipX(): number {
    return 1;
  }
}
