import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CinderblockStomp extends Class_Move {
  STATE_WIND_UP_1: number;
  STATE_WIND_UP_2: number;
  STATE_ATTACK: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  delayFrames: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.attackDamage = g.DAMAGE_CINDERBLOCK_STOMP;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.CINDERBLOCK;
    const vis = list(A.CINDERBLOCK_STOMP_01, A.CINDERBLOCK_STOMP_02, A.CINDERBLOCK_STOMP_03, A.CINDERBLOCK_STOMP_04);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_STOMP_01D, A.CINDERBLOCK_STOMP_02D, A.CINDERBLOCK_STOMP_03D, A.CINDERBLOCK_STOMP_04D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_WIND_UP_1 = 1;
    this.STATE_WIND_UP_2 = 2;
    this.STATE_ATTACK = 3;
    this.STATE_FINISH = 4;
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
      case this.STATE_WIND_UP_1:
        if (this.initState) {
          this.initState = 0;
          this.delayFrames = 3;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) this.advanceState();
        break;
      case this.STATE_WIND_UP_2:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 10;
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.advanceState();
        } else if (this.delayFrames === 8) {
          g.main.screen.addEffect(new g.classes.Class_CinderblockEnergyEffect(this.owner, this.owner.pos.add(point(58 * this.owner.dir, -73)), point(0, 0), this.owner.dir));
          g.main.screen.addEffect(new g.classes.Class_WhiteBurstEffect(this.owner, this.owner.pos.add(point(58 * this.owner.dir, -73)), point(0, 0), this.owner.dir));
        }
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.delayFrames = 10;
          this.projectile = new g.classes.Class_CinderblockWaveProjectile(this.owner, this.owner.pos.add(point(100 * this.owner.dir, 0)), point(0, 0), this.owner.dir);
          g.main.screen.addProjectile(this.projectile);
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_LANDING_BIG_PERSON, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          this.advanceState();
          this.projectile = undefined;
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
