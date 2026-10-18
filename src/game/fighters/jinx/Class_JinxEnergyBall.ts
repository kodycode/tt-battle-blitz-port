import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_JinxEnergyBall extends Class_Move {
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
    const A = g.assets.JINX;
    const vis = list(A.JINX_PUNCH_01, A.JINX_PUNCH_02, A.JINX_PUNCH_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.JINX_PUNCH_01D, A.JINX_PUNCH_02D, A.JINX_PUNCH_03D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
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
      g.main.audioMgr.stopSound(g.assets.JINX.SFX_JINX_MAKE_ENERGY_BALL);
    }
  }

  // Lingo `on advanceState` (handler without `me`, called locally): a method here.
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
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_CONJURE:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 2;
          this.effect = new g.classes.Class_JinxConjureEffect(o, o.pos.add(point(67 * o.dir, -87)), point(0, 0), o.dir);
          g.main.screen.addEffect(this.effect);
          g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_MAKE_ENERGY_BALL, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.effect.isAlive()) {
          this.effect.setPos(o.pos.add(point(67 * o.dir, -87)));
        } else {
          this.effect = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 5;
          this.projectile = new g.classes.Class_JinxBallProjectile(o, o.pos.add(point(67 * o.dir, -87)), point(15.0 * o.dir, 0.0), o.dir);
          g.main.screen.addProjectile(this.projectile);
          g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_RELEASE_ENERGY_BALL, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.projectile = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 2;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }
}
