import { g, list, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RavenWalkBackward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.RAVEN;
    const vis = list(A.RAVEN_WALK_01, A.RAVEN_WALK_02, A.RAVEN_WALK_03, A.RAVEN_WALK_04, A.RAVEN_WALK_05, A.RAVEN_WALK_06, A.RAVEN_WALK_07, A.RAVEN_WALK_08);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D, A.RAVEN_STAND_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.animation.setRepeat(2);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(-this.owner.dir * this.owner.WALK_SPEED, 0.0);
  }

  update(): void {
    super.update();
    if (this.age % 8 === 1) {
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_1, 50, g.SFX_EVENT_PRIORITY_LOW);
      else g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_2, 50, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  getFlipX(): number {
    return 1;
  }
}
