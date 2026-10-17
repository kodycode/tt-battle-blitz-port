import { g, list, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_RobinWalkForward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.ROBIN;
    const vis = list(A.ROBIN_WALK_01, A.ROBIN_WALK_02, A.ROBIN_WALK_03, A.ROBIN_WALK_04, A.ROBIN_WALK_05, A.ROBIN_WALK_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D, A.ROBIN_STAND_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.animation.setRepeat(3);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(_arg?: any): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(this.owner.dir * this.owner.WALK_SPEED, 0.0);
  }

  update(): void {
    super.update();
    if (this.age % 9 === 3) {
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_1, 50, g.SFX_EVENT_PRIORITY_LOW);
      else g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_2, 50, g.SFX_EVENT_PRIORITY_LOW);
    }
  }
}
