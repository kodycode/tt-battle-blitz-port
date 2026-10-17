import { g, Point, list, rect } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_BgBarsTitanEffect extends Class_Effect {
  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.BG_TITANS_STRETCH_000, g.assets.CHAR_SHARED.BG_TITANS_STRETCH_001, g.assets.CHAR_SHARED.BG_TITANS_STRETCH_002);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.animation.setRepeat(3);
    this.visSprite.locZ = g.SPRITE_LOCZ_BACKGROUND_EFFECT;
    this.visSprite.rect = rect(0, 0, 600, 400);
    this.visSprite.blend = 100;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  paint(): void {
    this.visSprite.rect = rect(0, 0, 600, 400);
  }
}
