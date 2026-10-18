import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_PlasmusStun extends Class_Move {
  // stunDuration: Lingo redeclares this property; it is Class_Move's field here.
  needInit: number;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_HIT_01);
    const att = list(g.MEMBER_0);
    const def = list(A.PLASMUS_HIT_01D);
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
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
    this.needInit = 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.needInit) {
      this.needInit = 0;
      g.main.screen.addEffect(new g.classes.Class_PlasmusHitSplatterEffect(this.owner, this.owner.pos.add(point(0.0, -175.0)), point(-30.0 * this.owner.dir, 0.0), this.owner.dir));
    }
    if (this.age >= this.stunDuration) this.moveDone = 1;
  }
}
