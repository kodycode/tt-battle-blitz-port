import { g, list, point, voidp, random } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_PlasmusKnockDown extends Class_Move {
  STATE_STUN: number;
  STATE_SLIDE: number;
  STATE_RECOVER: number;
  // stunDuration: Lingo redeclares this property; it is Class_Move's field here.
  initState: number;
  moveState: number;
  delayFrames: number;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_HIT_01, A.PLASMUS_FIST_CLENCH_03, A.PLASMUS_FIST_CLENCH_02, A.PLASMUS_FIST_CLENCH_01);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.PLASMUS_HIT_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D);
    const order = list(1, 2, 2, 3, 3, 4, 4, 2, 2, 3, 3, 4, 4);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.stunDuration = 0;
    this.STATE_STUN = 1;
    this.STATE_SLIDE = 2;
    this.STATE_RECOVER = 3;
    // moveState/initState/delayFrames stay VOID until reset(), as in the Lingo.
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    this.moveState = 1;
    this.initState = 1;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_STUN:
        if (this.initState) this.initState = 0;
        if (this.age >= this.stunDuration) this.advanceState();
        break;
      case this.STATE_SLIDE:
        if (this.initState) {
          this.initState = 0;
          g.main.screen.addEffect(new g.classes.Class_PlasmusHitSplatterEffect(this.owner, this.owner.pos.add(point(0.0, -175.0)), point(-35.0 * this.owner.dir, 0.0), this.owner.dir));
          this.owner.setVelX(-20.0 * this.owner.dir);
        }
        this.owner.accelerate(point(1.5 * this.owner.dir, 0.0));
        if (this.owner.dir > 0) {
          if (this.owner.getVelX() >= 0.0) {
            this.owner.setVelX(0.0);
            this.advanceState();
          }
        } else if (this.owner.getVelX() <= 0.0) {
          this.owner.setVelX(0.0);
          this.advanceState();
        }
        break;
      case this.STATE_RECOVER:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 6;
          if (random(2) === 1) g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_ROAR_SMALL, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.animation.advance();
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
