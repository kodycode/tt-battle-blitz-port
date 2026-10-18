import { g, list, point, random } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_PlasmusSludgeThrow extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FINISH: number; // declared but never assigned in the Lingo
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_TOSS_01, A.PLASMUS_TOSS_02, A.PLASMUS_TOSS_03, A.PLASMUS_TOSS_04, A.PLASMUS_TOSS_05, A.PLASMUS_TOSS_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.PLASMUS_TOSS_01D, A.PLASMUS_TOSS_02D, A.PLASMUS_TOSS_03D, A.PLASMUS_TOSS_04D, A.PLASMUS_TOSS_05D, A.PLASMUS_TOSS_06D);
    const order = list(1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.moveState = 1;
    this.initState = 1;
    this.delayFrames = 0;
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
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
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
      case this.STATE_LAUNCH:
        if (this.initState) this.initState = 0;
        if (this.age > 1) this.animation.advance();
        switch (this.animation.orderIndex) {
          case 3:
            g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCH_1, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 10:
            g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_STRETCH_2, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 18:
            this.advanceState();
            break;
        }
        break;
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 15;
          this.projectile = new g.classes.Class_PlasmusSludgeProjectile(this.owner, this.owner.pos.add(point(50 * this.owner.dir, -105)), point(15.0 * this.owner.dir, -40.0), this.owner.dir);
          g.main.screen.addProjectile(this.projectile);
          g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_SLUDGE_THROW, 100, g.SFX_EVENT_PRIORITY_LOW);
          if (random(2) === 1) g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_ROAR_BIG, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.projectile = undefined;
          this.moveDone = 1;
        }
        break;
    }
  }
}
