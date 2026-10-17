import { g, list } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_CyborgStand extends Class_Move {
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_STAND_01);
    const visAlt = list(A.CYBORG_STAND_ALT_01);
    const att = list(g.MEMBER_0);
    const def = list(A.CYBORG_STAND_01D);
    this.visAnim = new g.classes.Class_LoopedAnimation(vis);
    this.visAltAnim = new g.classes.Class_LoopedAnimation(visAlt);
    this.animation = this.visAnim;
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
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
  }
}
