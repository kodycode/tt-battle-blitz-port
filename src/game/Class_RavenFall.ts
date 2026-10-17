import { g, list, point } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RavenFall extends Class_Move {
  STATE_DESCENT_1: number;
  STATE_DESCENT_2: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  jumpDir: number; // declared in the Lingo property list, never used

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.RAVEN;
    const vis = list(A.RAVEN_JUMP_02, A.RAVEN_JUMP_03, A.RAVEN_JUMP_04);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.RAVEN_JUMP_02D, A.RAVEN_JUMP_03D, A.RAVEN_JUMP_04D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_DESCENT_1 = 1;
    this.STATE_DESCENT_2 = 2;
    this.STATE_LAND = 3;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Lingo `on setState i` / `on advanceState` (handlers without `me`, called locally): methods here.
  setState(i: number): void {
    this.initState = 1;
    this.moveState = i;
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_DESCENT_1:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 8;
        }
        this.delayFrames = this.delayFrames - 1;
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.setState(this.STATE_LAND);
        } else if (this.delayFrames === 0) {
          this.advanceState();
        }
        break;
      case this.STATE_DESCENT_2:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
        }
        this.owner.accelerate(g.gravity);
        if (this.owner.fallCheck()) {
          this.owner.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
          this.delayFrames = 3;
          this.owner.setOnGround(1);
          g.main.screen.addEffect(new g.classes.Class_DustFallEffect(this.owner, this.owner.pos, point(0, 0), this.owner.dir));
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_SMALL_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.moveDone = 1;
        break;
    }
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
    this.owner.setOnGround(0);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
  }
}
