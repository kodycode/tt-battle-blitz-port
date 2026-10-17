import { g, list, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_PlasmusWalkForward extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_WALK_01, A.PLASMUS_WALK_02, A.PLASMUS_WALK_03, A.PLASMUS_WALK_04, A.PLASMUS_WALK_05, A.PLASMUS_WALK_06);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D, A.PLASMUS_STAND_01D);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.animation.setRepeat(6);
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
    switch (this.age % 18) {
      case 5:
        g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_SHAMBLE, 100, g.SFX_EVENT_PRIORITY_LOW);
        break;
      case 13:
        if (random(2) === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_BIG_PERSON_1, 70, g.SFX_EVENT_PRIORITY_LOW);
        else g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_BIG_PERSON_2, 70, g.SFX_EVENT_PRIORITY_LOW);
        break;
    }
  }
}
