import { g, list, voidp } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_BeastboyStun extends Class_Move {
  // `stunDuration` is redeclared in the Lingo property list; it is Class_Move's field here.

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.BEASTBOY;
    const vis = list(A.BEASTBOY_HIT_01);
    const att = list(g.MEMBER_0);
    const def = list(A.BEASTBOY_HIT_01D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
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
  }

  update(): void {
    this.age = this.age + 1;
    if (this.age >= this.stunDuration) this.moveDone = 1;
  }
}
