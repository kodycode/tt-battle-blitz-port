import { g, list, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_CinderblockWalkForward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.CINDERBLOCK;
    const vis = list(A.CINDERBLOCK_WALK_01, A.CINDERBLOCK_WALK_02, A.CINDERBLOCK_WALK_03, A.CINDERBLOCK_WALK_04, A.CINDERBLOCK_WALK_05, A.CINDERBLOCK_WALK_06, A.CINDERBLOCK_WALK_07, A.CINDERBLOCK_WALK_08);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D, A.CINDERBLOCK_STAND_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.animation.setRepeat(4);
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
    this.owner.setVel(this.owner.dir * this.owner.WALK_SPEED, 0.0);
  }

  update(): void {
    super.update();
    if (this.age % 16 === 1) {
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_BIG_PERSON_1, 50, g.SFX_EVENT_PRIORITY_LOW);
      else g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_BIG_PERSON_2, 50, g.SFX_EVENT_PRIORITY_LOW);
    }
  }
}
