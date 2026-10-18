import { g, list, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CyborgStun extends Class_Move {
  // stunDuration: redeclared in the Lingo property list; same field as Class_Move.stunDuration.
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_HIT_01);
    const visAlt = list(A.CYBORG_HIT_ALT_01);
    const att = list(g.MEMBER_0);
    const def = list(A.CYBORG_HIT_01D);
    this.visAnim = new g.classes.Class_PlayOnceAnimation(vis);
    this.visAltAnim = new g.classes.Class_PlayOnceAnimation(visAlt);
    this.animation = this.visAnim;
    this.attackMasks = att;
    this.defenseMasks = def;
    this.stunDuration = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.owner.setVel(0.0, 0.0);
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age >= this.stunDuration) this.moveDone = 1;
  }
}
