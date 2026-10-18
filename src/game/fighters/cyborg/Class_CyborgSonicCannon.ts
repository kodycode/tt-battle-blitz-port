import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CyborgSonicCannon extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
  projectile: any;
  visAnim: any;
  visAltAnim: any;

  constructor(owner: any) {
    super(owner);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_CANNON_01, A.CYBORG_CANNON_02, A.CYBORG_CANNON_03);
    const visAlt = list(A.CYBORG_CANNON_ALT_01, A.CYBORG_CANNON_ALT_02, A.CYBORG_CANNON_ALT_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.CYBORG_CANNON_01D, A.CYBORG_CANNON_02D, A.CYBORG_CANNON_03D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 2, 1);
    this.visAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.visAltAnim = new g.classes.Class_IndexedAnimation(visAlt, order);
    this.animation = this.visAnim;
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.STATE_FINISH = 3;
    this.moveState = 1;
    this.initState = 1;
    // `delayFrames = 0` here in the original: not a property of this script, so a dead local.
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  stop(): void {
    super.stop();
    if (!voidp(this.projectile)) this.projectile = this.projectile.destroy();
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.projectile = undefined;
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
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_CANNON_OUT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 3) {
          this.animation.advance();
        } else if (this.stateAge === 6) {
          this.animation.advance();
          g.main.screen.addEffect(new g.classes.Class_CyborgPowerUpEffect(this.owner, this.owner.pos.add(point(82 * this.owner.dir, -112)), point(0, 0), this.owner.dir));
        } else if (this.stateAge === 14) {
          this.advanceState();
        }
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.projectile = new g.classes.Class_CyborgCannonProjectile(this.owner, this.owner.pos.add(point(82 * this.owner.dir, -112)), point(0, 0), this.owner.dir);
          g.main.screen.addProjectile(this.projectile);
        }
        if (this.stateAge === 15) {
          this.projectile.kill();
          this.projectile = undefined;
          this.advanceState();
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_CANNON_IN, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 4) this.animation.advance();
        else if (this.stateAge === 8) this.moveDone = 1;
        break;
    }
  }
}
