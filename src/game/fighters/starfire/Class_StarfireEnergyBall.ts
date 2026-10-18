import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_StarfireEnergyBall extends Class_Move {
  STATE_LAUNCH: number;
  STATE_CONJURE: number;
  STATE_WAIT: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
  delayFrames: number;
  projectile: any;
  effect: any;

  constructor(owner: any) {
    super(owner);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    const A = g.assets.STARFIRE;
    const vis = list(A.STARFIRE_PUNCH_01, A.STARFIRE_PUNCH_02, A.STARFIRE_PUNCH_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.STARFIRE_PUNCH_01D, A.STARFIRE_PUNCH_02D, A.STARFIRE_PUNCH_03D);
    const order = list(1, 2, 3, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_CONJURE = 2;
    this.STATE_WAIT = 3;
    this.STATE_FINISH = 4;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.stateAge = 0;
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
    this.projectile = undefined;
    this.effect = undefined;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    super.stop();
    if (!voidp(this.effect)) {
      g.game.killEffect(this.effect);
      this.effect = undefined;
    }
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 4;
        }
        o.moveBy(-3.0 * o.dir, 0.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_CONJURE:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 7;
          this.effect = new g.classes.Class_StarfireConjureEffect(o, o.pos.add(point(-28 * o.dir, -130)), point(0, 0), o.dir);
          g.main.screen.addEffect(this.effect);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_MAKINGSTARBOLT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        o.moveBy(-2.0 * o.dir, 0.0);
        if (this.effect.isAlive()) this.effect.setPos(o.pos.add(point(-28 * o.dir, -130)));
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.effect = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 10;
          this.projectile = new g.classes.Class_StarfireBallProjectile(o, o.pos.add(point(75 * o.dir, -138)), point(17.0 * o.dir, 0.0), o.dir);
          g.main.screen.addProjectile(this.projectile);
          g.main.screen.addEffect(new g.classes.Class_StarfireFistEffect(o, o.pos.add(point(85 * o.dir, -138)), point(0.0, 0.0), o.dir));
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames >= 6) {
          o.moveBy(12.0 * o.dir, 0.0);
        } else if (this.delayFrames === 0) {
          this.projectile = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 3;
        }
        o.moveBy(-10.0 * o.dir, 0.0);
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
