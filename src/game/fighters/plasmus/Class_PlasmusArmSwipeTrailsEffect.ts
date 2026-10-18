import { g, Point, list } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_PlasmusArmSwipeTrailsEffect extends Class_Effect {
  otherArm: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    let vis = list(g.assets.PLASMUS.PLASMUS_ARMSWIPE_03_ARM1);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.animation.setRepeat(3);
    this.visSprite.blend = 75;
    this.otherArm = new g.classes.Class_Effect(owner, initPos, initVel, initDir);
    vis = list(g.assets.PLASMUS.PLASMUS_ARMSWIPE_03_ARM2);
    this.otherArm.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.otherArm.animation.setRepeat(3);
    this.otherArm.visSprite.blend = 50;
  }

  destroy(): undefined {
    super.destroy();
    this.otherArm.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    this.otherArm.update();
    if (this.alive) {
      if (this.age > 1) {
        let iBlend1 = this.visSprite.blend - 30;
        if (iBlend1 < 0) iBlend1 = 0;
        let iBlend2 = this.otherArm.visSprite.blend - 20;
        if (iBlend2 < 0) iBlend2 = 0;
        this.visSprite.blend = iBlend1;
        this.otherArm.visSprite.blend = iBlend2;
      }
    }
  }

  paint(): void {
    super.paint();
    this.otherArm.paint();
  }
}
