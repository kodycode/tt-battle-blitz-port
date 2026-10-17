import { g, list, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_CyborgWalkBackward extends Class_Move {
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(0);
    this.setInterruptible(1);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_RUN_01, A.CYBORG_RUN_02, A.CYBORG_RUN_03, A.CYBORG_RUN_04, A.CYBORG_RUN_05, A.CYBORG_RUN_06, A.CYBORG_RUN_07, A.CYBORG_RUN_08);
    const visAlt = list(A.CYBORG_RUN_ALT_01, A.CYBORG_RUN_ALT_02, A.CYBORG_RUN_ALT_03, A.CYBORG_RUN_ALT_04, A.CYBORG_RUN_ALT_05, A.CYBORG_RUN_ALT_06, A.CYBORG_RUN_ALT_07, A.CYBORG_RUN_ALT_08);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const d = A.CYBORG_STAND_01D;
    const def = list(d, d, d, d, d, d, d, d);
    this.visAnim = new g.classes.Class_LoopedAnimation(vis);
    this.visAltAnim = new g.classes.Class_LoopedAnimation(visAlt);
    this.visAnim.setRepeat(2);
    this.visAltAnim.setRepeat(2);
    this.animation = this.visAnim;
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
    this.dirChanged();
  }

  // Walking backward shows the mirrored (getFlipX) frames, so the anim choice is swapped.
  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAltAnim;
    else this.animation = this.visAnim;
    this.animation.reset();
  }

  update(): void {
    super.update();
    if (this.age % 9 === 3) {
      if (random(2) === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_1, 50, g.SFX_EVENT_PRIORITY_LOW);
      else g.main.audioMgr.playSound(g.assets.AUDIO.SFX_WALKING_SMALL_PERSON_2, 50, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  getFlipX(): number {
    return 1;
  }
}
