import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_PlasmusDefeat extends Class_Move {
  STATE_LAUNCH: number;
  STATE_FALLING: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  // stunDuration: Lingo redeclares this property; it is Class_Move's field here.
  initStateAge: number;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(0);
    this.setInitOwnerDir(1);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_HIT_01, A.PLASMUS_DEFEAT_01, A.PLASMUS_DEFEAT_02, A.PLASMUS_DEFEAT_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.PLASMUS_HIT_01D, A.PLASMUS_DEFEAT_01D, A.PLASMUS_DEFEAT_02D, A.PLASMUS_DEFEAT_03D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_FALLING = 2;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.stunDuration = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    if (voidp(arg)) this.stunDuration = 0;
    else this.stunDuration = arg;
    if (this.owner.getPosY() > 0.0) this.owner.setPosY(0.0);
    this.owner.setVel(0.0, 0.0);
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
  }

  setState(i: number): void {
    this.initState = 1;
    this.initStateAge = this.age;
    this.moveState = i;
  }

  advanceState(): void {
    this.setState(this.moveState + 1);
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = this.stunDuration;
          if (this.delayFrames < 1) this.delayFrames = 1;
          g.main.screen.addEffect(new g.classes.Class_PlasmusHitSplatterEffect(this.owner, this.owner.pos.add(point(0.0, -175.0)), point(-30.0 * this.owner.dir, 0.0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_TRANSFORM, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_FALLING:
        if (this.initState) this.initState = 0;
        if ((this.age - this.initStateAge) % 10 === 0) {
          if (this.animation.isDone()) {
            this.owner.setAlive(0);
            this.moveDone = 1;
          } else {
            this.animation.advance();
          }
        }
        break;
    }
  }
}
